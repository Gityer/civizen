package com.civizen.app;

import android.app.Activity;
import android.content.Intent;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.content.pm.Signature;
import android.content.pm.SigningInfo;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;
import androidx.core.content.FileProvider;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.BufferedInputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.security.MessageDigest;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * Downloads an APK into app cache and launches the system package installer.
 * Used for sideload in-app updates (not Play Store).
 */
@CapacitorPlugin(name = "ApkUpdater")
public class ApkUpdaterPlugin extends Plugin {
  public static final String ERROR_INSTALL_PERMISSION_REQUIRED = "INSTALL_PERMISSION_REQUIRED";

  private static final ExecutorService EXECUTOR = Executors.newSingleThreadExecutor();
  private static final int CONNECT_TIMEOUT_MS = 30_000;
  private static final int READ_TIMEOUT_MS = 120_000;
  private static final int MAX_REDIRECTS = 5;

  @PluginMethod
  public void downloadAndInstall(PluginCall call) {
    String url = call.getString("url");
    if (url == null || url.trim().isEmpty()) {
      call.reject("Missing APK url");
      return;
    }

    final String downloadUrl = url.trim();
    EXECUTOR.execute(() -> {
      HttpURLConnection connection = null;
      try {
        Activity activity = getActivity();
        if (activity == null) {
          call.reject("Activity unavailable");
          return;
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
            && !activity.getPackageManager().canRequestPackageInstalls()) {
          Intent settingsIntent = new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES);
          settingsIntent.setData(Uri.parse("package:" + activity.getPackageName()));
          settingsIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
          activity.startActivity(settingsIntent);
          // Do not browser-fallback on this path — the JS layer must keep the update prompt
          // and retry after the user enables install permission.
          call.reject(
            "Enable installing apps from Civizen, then tap Update again.",
            ERROR_INSTALL_PERMISSION_REQUIRED
          );
          return;
        }

        connection = openDownloadConnection(downloadUrl);
        int code = connection.getResponseCode();
        if (code < 200 || code >= 300) {
          call.reject("Download failed with HTTP " + code);
          return;
        }

        File updatesDir = new File(activity.getCacheDir(), "updates");
        if (!updatesDir.exists() && !updatesDir.mkdirs()) {
          call.reject("Could not create updates cache directory");
          return;
        }

        File apkFile = new File(updatesDir, "civizen-update.apk");
        try (
          InputStream input = new BufferedInputStream(connection.getInputStream());
          FileOutputStream output = new FileOutputStream(apkFile)
        ) {
          byte[] buffer = new byte[8192];
          int read;
          while ((read = input.read(buffer)) != -1) {
            output.write(buffer, 0, read);
          }
          output.flush();
        }

        if (apkFile.length() < 1024) {
          // Likely HTML/error body rather than an APK.
          //noinspection ResultOfMethodCallIgnored
          apkFile.delete();
          call.reject("Downloaded file was too small to be a valid APK");
          return;
        }

        Uri contentUri = FileProvider.getUriForFile(
          activity,
          activity.getPackageName() + ".fileprovider",
          apkFile
        );

        Intent installIntent = new Intent(Intent.ACTION_VIEW);
        installIntent.setDataAndType(contentUri, "application/vnd.android.package-archive");
        installIntent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
        installIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);

        PackageManager packageManager = activity.getPackageManager();
        if (installIntent.resolveActivity(packageManager) == null) {
          call.reject("No package installer available on this device");
          return;
        }

        activity.startActivity(installIntent);

        JSObject result = new JSObject();
        result.put("ok", true);
        result.put("path", apkFile.getAbsolutePath());
        call.resolve(result);
      } catch (Exception error) {
        call.reject("APK download/install failed: " + error.getMessage(), error);
      } finally {
        if (connection != null) {
          connection.disconnect();
        }
      }
    });
  }

  /**
   * Opens an HTTPS/APK URL in an external activity without replacing the Capacitor WebView.
   * Used only as a last-resort fallback when in-app install cannot run.
   */
  @PluginMethod
  public void openExternalUrl(PluginCall call) {
    String url = call.getString("url");
    if (url == null || url.trim().isEmpty()) {
      call.reject("Missing url");
      return;
    }

    Activity activity = getActivity();
    if (activity == null) {
      call.reject("Activity unavailable");
      return;
    }

    try {
      Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url.trim()));
      intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
      activity.startActivity(intent);
      JSObject result = new JSObject();
      result.put("ok", true);
      call.resolve(result);
    } catch (Exception error) {
      call.reject("Could not open external url: " + error.getMessage(), error);
    }
  }

  /**
   * Reports who signed the installed app and which store installed it, so the update prompt can tell a key mismatch
   * (a debug build, or a Google Play copy that Play re-signed) from a normal in-place update.
   * Resolves { certSha256: string[] (lowercase hex, one per signing certificate), installer: string | null }.
   */
  @PluginMethod
  public void getInstallInfo(PluginCall call) {
    Activity activity = getActivity();
    if (activity == null) {
      call.reject("Activity unavailable");
      return;
    }

    try {
      PackageManager packageManager = activity.getPackageManager();
      String packageName = activity.getPackageName();
      JSArray certificates = new JSArray();

      Signature[] signatures;
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
        PackageInfo info = packageManager.getPackageInfo(packageName, PackageManager.GET_SIGNING_CERTIFICATES);
        SigningInfo signingInfo = info.signingInfo;
        signatures = signingInfo == null
          ? new Signature[0]
          : (signingInfo.hasMultipleSigners() ? signingInfo.getApkContentsSigners() : signingInfo.getSigningCertificateHistory());
      } else {
        @SuppressWarnings("deprecation")
        PackageInfo info = packageManager.getPackageInfo(packageName, PackageManager.GET_SIGNATURES);
        @SuppressWarnings("deprecation")
        Signature[] legacy = info.signatures;
        signatures = legacy == null ? new Signature[0] : legacy;
      }
      for (Signature signature : signatures) {
        certificates.put(sha256Hex(signature.toByteArray()));
      }

      String installer;
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
        installer = packageManager.getInstallSourceInfo(packageName).getInstallingPackageName();
      } else {
        @SuppressWarnings("deprecation")
        String legacyInstaller = packageManager.getInstallerPackageName(packageName);
        installer = legacyInstaller;
      }

      JSObject result = new JSObject();
      result.put("certSha256", certificates);
      result.put("installer", installer);
      call.resolve(result);
    } catch (Exception error) {
      call.reject("Could not read the install info: " + error.getMessage(), error);
    }
  }

  private static String sha256Hex(byte[] bytes) throws Exception {
    byte[] digest = MessageDigest.getInstance("SHA-256").digest(bytes);
    StringBuilder hex = new StringBuilder(digest.length * 2);
    for (byte value : digest) {
      hex.append(String.format("%02x", value));
    }
    return hex.toString();
  }

  private static HttpURLConnection openDownloadConnection(String downloadUrl) throws Exception {
    URL current = new URL(downloadUrl);
    for (int redirect = 0; redirect <= MAX_REDIRECTS; redirect += 1) {
      HttpURLConnection connection = (HttpURLConnection) current.openConnection();
      connection.setInstanceFollowRedirects(false);
      connection.setConnectTimeout(CONNECT_TIMEOUT_MS);
      connection.setReadTimeout(READ_TIMEOUT_MS);
      connection.setRequestProperty("Accept", "application/vnd.android.package-archive,*/*");
      connection.connect();

      int code = connection.getResponseCode();
      if (code >= 300 && code < 400) {
        String location = connection.getHeaderField("Location");
        connection.disconnect();
        if (location == null || location.trim().isEmpty()) {
          throw new IllegalStateException("Redirect without Location header");
        }
        current = new URL(current, location.trim());
        continue;
      }

      return connection;
    }

    throw new IllegalStateException("Too many redirects while downloading APK");
  }
}
