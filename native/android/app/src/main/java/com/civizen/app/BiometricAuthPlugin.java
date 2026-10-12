package com.civizen.app;

import android.content.Context;
import android.content.SharedPreferences;
import android.os.Handler;
import android.os.Looper;
import androidx.annotation.NonNull;
import androidx.biometric.BiometricManager;
import androidx.biometric.BiometricPrompt;
import androidx.core.content.ContextCompat;
import androidx.fragment.app.FragmentActivity;
import androidx.security.crypto.EncryptedSharedPreferences;
import androidx.security.crypto.MasterKeys;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.IOException;
import java.security.GeneralSecurityException;
import java.util.concurrent.Executor;

/**
 * Device biometrics gate for unlocking a locally stored Supabase session.
 * Tokens live in EncryptedSharedPreferences; reads require a successful BiometricPrompt.
 */
@CapacitorPlugin(name = "BiometricAuth")
public class BiometricAuthPlugin extends Plugin {
  public static final String ERROR_UNAVAILABLE = "BIOMETRIC_UNAVAILABLE";
  public static final String ERROR_USER_CANCEL = "BIOMETRIC_USER_CANCEL";
  public static final String ERROR_FAILED = "BIOMETRIC_FAILED";
  public static final String ERROR_NO_SESSION = "BIOMETRIC_NO_SESSION";

  private static final String PREFS_NAME = "civizen_biometric_session_v1";
  private static final String KEY_ACCESS = "access_token";
  private static final String KEY_REFRESH = "refresh_token";
  private static final String KEY_USER_ID = "user_id";
  private static final String KEY_EMAIL = "email";
  private static final String KEY_DISPLAY_NAME = "display_name";
  private static final String KEY_ENABLED = "enabled";

  private final Handler mainHandler = new Handler(Looper.getMainLooper());

  @PluginMethod
  public void isAvailable(PluginCall call) {
    BiometricManager manager = BiometricManager.from(getContext());
    int status = manager.canAuthenticate(BiometricManager.Authenticators.BIOMETRIC_STRONG);
    boolean available = status == BiometricManager.BIOMETRIC_SUCCESS;
    // Fallback to weak biometrics (face unlock on some devices) when strong is unavailable.
    if (!available) {
      status = manager.canAuthenticate(
        BiometricManager.Authenticators.BIOMETRIC_STRONG
          | BiometricManager.Authenticators.BIOMETRIC_WEAK
      );
      available = status == BiometricManager.BIOMETRIC_SUCCESS;
    }

    JSObject result = new JSObject();
    result.put("available", available);
    result.put("status", statusToLabel(status));
    call.resolve(result);
  }

  @PluginMethod
  public void hasStoredSession(PluginCall call) {
    try {
      SharedPreferences prefs = securePrefs();
      boolean has =
        prefs.getBoolean(KEY_ENABLED, false)
          && !nullOrEmpty(prefs.getString(KEY_REFRESH, null));
      JSObject result = new JSObject();
      result.put("hasSession", has);
      call.resolve(result);
    } catch (Exception error) {
      call.reject("Could not read biometric session vault", error);
    }
  }

  @PluginMethod
  public void storeSession(PluginCall call) {
    String accessToken = call.getString("accessToken");
    String refreshToken = call.getString("refreshToken");
    String userId = call.getString("userId");
    if (nullOrEmpty(accessToken) || nullOrEmpty(refreshToken) || nullOrEmpty(userId)) {
      call.reject("Missing accessToken, refreshToken, or userId");
      return;
    }

    try {
      SharedPreferences prefs = securePrefs();
      prefs
        .edit()
        .putBoolean(KEY_ENABLED, true)
        .putString(KEY_ACCESS, accessToken)
        .putString(KEY_REFRESH, refreshToken)
        .putString(KEY_USER_ID, userId)
        .putString(KEY_EMAIL, call.getString("email", ""))
        .putString(KEY_DISPLAY_NAME, call.getString("displayName", ""))
        .apply();
      JSObject result = new JSObject();
      result.put("ok", true);
      call.resolve(result);
    } catch (Exception error) {
      call.reject("Could not store biometric session", error);
    }
  }

  @PluginMethod
  public void clearSession(PluginCall call) {
    try {
      SharedPreferences prefs = securePrefs();
      prefs.edit().clear().apply();
      JSObject result = new JSObject();
      result.put("ok", true);
      call.resolve(result);
    } catch (Exception error) {
      call.reject("Could not clear biometric session", error);
    }
  }

  @PluginMethod
  public void authenticate(PluginCall call) {
    String reason = call.getString("reason", "Confirm it is you");
    promptBiometric(
      call,
      reason,
      () -> {
        JSObject result = new JSObject();
        result.put("ok", true);
        call.resolve(result);
      }
    );
  }

  @PluginMethod
  public void unlockSession(PluginCall call) {
    try {
      SharedPreferences prefs = securePrefs();
      boolean has =
        prefs.getBoolean(KEY_ENABLED, false)
          && !nullOrEmpty(prefs.getString(KEY_REFRESH, null));
      if (!has) {
        call.reject("No biometric session stored on this device", ERROR_NO_SESSION);
        return;
      }
    } catch (Exception error) {
      call.reject("Could not read biometric session vault", error);
      return;
    }

    String reason = call.getString("reason", "Sign in to Civizen");
    promptBiometric(
      call,
      reason,
      () -> {
        try {
          SharedPreferences prefs = securePrefs();
          String access = prefs.getString(KEY_ACCESS, null);
          String refresh = prefs.getString(KEY_REFRESH, null);
          String userId = prefs.getString(KEY_USER_ID, null);
          if (nullOrEmpty(access) || nullOrEmpty(refresh) || nullOrEmpty(userId)) {
            call.reject("No biometric session stored on this device", ERROR_NO_SESSION);
            return;
          }
          JSObject result = new JSObject();
          result.put("ok", true);
          result.put("accessToken", access);
          result.put("refreshToken", refresh);
          result.put("userId", userId);
          result.put("email", prefs.getString(KEY_EMAIL, ""));
          result.put("displayName", prefs.getString(KEY_DISPLAY_NAME, ""));
          call.resolve(result);
        } catch (Exception error) {
          call.reject("Could not unlock biometric session", error);
        }
      }
    );
  }

  private void promptBiometric(PluginCall call, String reason, Runnable onSuccess) {
    android.app.Activity rawActivity = getActivity();
    if (!(rawActivity instanceof FragmentActivity)) {
      call.reject("Activity unavailable", ERROR_UNAVAILABLE);
      return;
    }
    final FragmentActivity activity = (FragmentActivity) rawActivity;

    final int authenticators =
      BiometricManager.Authenticators.BIOMETRIC_STRONG
        | BiometricManager.Authenticators.BIOMETRIC_WEAK;
    BiometricManager manager = BiometricManager.from(getContext());
    int status = manager.canAuthenticate(authenticators);
    if (status != BiometricManager.BIOMETRIC_SUCCESS) {
      call.reject("Biometrics are not available on this device", ERROR_UNAVAILABLE);
      return;
    }

    mainHandler.post(() -> {
      Executor executor = ContextCompat.getMainExecutor(activity);
      BiometricPrompt prompt = new BiometricPrompt(
        activity,
        executor,
        new BiometricPrompt.AuthenticationCallback() {
          @Override
          public void onAuthenticationSucceeded(
            @NonNull BiometricPrompt.AuthenticationResult result
          ) {
            onSuccess.run();
          }

          @Override
          public void onAuthenticationError(int errorCode, @NonNull CharSequence errString) {
            if (
              errorCode == BiometricPrompt.ERROR_USER_CANCELED
                || errorCode == BiometricPrompt.ERROR_NEGATIVE_BUTTON
                || errorCode == BiometricPrompt.ERROR_CANCELED
            ) {
              call.reject(errString.toString(), ERROR_USER_CANCEL);
              return;
            }
            call.reject(errString.toString(), ERROR_FAILED);
          }

          @Override
          public void onAuthenticationFailed() {
            // Keep the prompt open for another attempt; do not reject yet.
          }
        }
      );

      BiometricPrompt.PromptInfo info = new BiometricPrompt.PromptInfo.Builder()
        .setTitle("Civizen")
        .setSubtitle(reason)
        .setAllowedAuthenticators(authenticators)
        .setNegativeButtonText("Cancel")
        .build();

      prompt.authenticate(info);
    });
  }

  private SharedPreferences securePrefs() throws GeneralSecurityException, IOException {
    Context context = getContext();
    String masterKeyAlias = MasterKeys.getOrCreate(MasterKeys.AES256_GCM_SPEC);
    return EncryptedSharedPreferences.create(
      PREFS_NAME,
      masterKeyAlias,
      context,
      EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
      EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
    );
  }

  private static boolean nullOrEmpty(String value) {
    return value == null || value.trim().isEmpty();
  }

  private static String statusToLabel(int status) {
    switch (status) {
      case BiometricManager.BIOMETRIC_SUCCESS:
        return "available";
      case BiometricManager.BIOMETRIC_ERROR_NONE_ENROLLED:
        return "none_enrolled";
      case BiometricManager.BIOMETRIC_ERROR_HW_UNAVAILABLE:
        return "hw_unavailable";
      case BiometricManager.BIOMETRIC_ERROR_NO_HARDWARE:
        return "no_hardware";
      case BiometricManager.BIOMETRIC_ERROR_SECURITY_UPDATE_REQUIRED:
        return "security_update_required";
      case BiometricManager.BIOMETRIC_ERROR_UNSUPPORTED:
        return "unsupported";
      case BiometricManager.BIOMETRIC_STATUS_UNKNOWN:
      default:
        return "unknown";
    }
  }
}
