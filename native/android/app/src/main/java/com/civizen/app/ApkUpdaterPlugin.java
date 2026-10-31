package com.civizen.app;

import android.app.Activity;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;
import androidx.core.content.FileProvider;
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
