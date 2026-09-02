package com.tamaos.jetstream;

import android.animation.ObjectAnimator;
import android.app.Activity;
import android.app.AlertDialog;
import android.content.ActivityNotFoundException;
import android.content.Context;
import android.content.Intent;
import android.graphics.Bitmap;
import android.graphics.Color;
import android.graphics.Typeface;
import android.net.ConnectivityManager;
import android.net.NetworkInfo;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.os.Vibrator;
import android.util.Base64;
import android.util.Log;
import android.view.Gravity;
import android.view.KeyEvent;
import android.view.View;
import android.view.ViewGroup;
import android.view.Window;
import android.view.WindowManager;
import android.webkit.ConsoleMessage;
import android.webkit.CookieManager;
import android.webkit.DownloadListener;
import android.webkit.JavascriptInterface;
import android.webkit.PermissionRequest;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.TextView;
import android.widget.Toast;

import java.io.File;
import java.io.FileOutputStream;
import java.io.OutputStream;

/**
 * JETSTREAM — native Android shell around the live web game.
 *
 * Responsibilities: branded boot screen, immersive full-screen WebView tuned for
 * WebGL (the globe), in-app navigation for the game's own host, external links
 * to the browser, offline fallback with retry, save export/import (file chooser
 * + share sheet), haptics bridge, and Android back-button handling.
 */
public class MainActivity extends Activity {
    private static final String TAG = "Jetstream";
    private static final int REQ_FILE_CHOOSER = 4101;
    private static final String VERSION = "2.0.0";

    private WebView web;
    private FrameLayout root;
    private View boot;
    private TextView bootStatus;
    private ValueCallback<Uri[]> pendingFileChooser;
    private boolean bootHidden = false;
    private boolean showingOffline = false;
    private long lastBackPress = 0;
    private String appUrl;
    private String appHost;
    private final Handler ui = new Handler(Looper.getMainLooper());

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        appUrl = getString(R.string.app_url);
        appHost = getString(R.string.app_host);

        setTheme(R.style.JetstreamTheme);
        Window w = getWindow();
        w.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        w.setStatusBarColor(0xFF070B12);
        w.setNavigationBarColor(0xFF070B12);

        root = new FrameLayout(this);
        root.setBackgroundColor(0xFF070B12);
        setContentView(root, new ViewGroup.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));

        web = new WebView(this);
        root.addView(web, new FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
        configureWebView();

        boot = buildBootScreen();
        root.addView(boot, new FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));

        applyImmersive();

        if (savedInstanceState == null || web.restoreState(savedInstanceState) == null) {
            loadGame();
        }
    }

    // ------------------------------------------------------------------ WebView

    private void configureWebView() {
        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setCacheMode(WebSettings.LOAD_DEFAULT);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setSupportZoom(false);
        s.setBuiltInZoomControls(false);
        s.setDisplayZoomControls(false);
        s.setUseWideViewPort(true);
        s.setLoadWithOverviewMode(true);
        s.setAllowFileAccess(false);
        s.setAllowContentAccess(false);
        s.setGeolocationEnabled(false);
        s.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        s.setJavaScriptCanOpenWindowsAutomatically(false);
        s.setSupportMultipleWindows(false);
        s.setUserAgentString(s.getUserAgentString() + " JetstreamApp/" + VERSION);
        web.setLayerType(View.LAYER_TYPE_HARDWARE, null);
        web.setBackgroundColor(0xFF070B12);
        web.setOverScrollMode(View.OVER_SCROLL_NEVER);
        web.setVerticalScrollBarEnabled(false);
        web.setHorizontalScrollBarEnabled(false);
        web.addJavascriptInterface(new NativeBridge(), "JetstreamNative");
        CookieManager.getInstance().setAcceptCookie(true);
        CookieManager.getInstance().setAcceptThirdPartyCookies(web, false);

        web.setWebViewClient(new WebViewClient() {
            // API 24+ overload (compiled against API 23 stubs, so no @Override; dispatched by signature at runtime)
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                return handleUrl(request.getUrl());
            }

            @SuppressWarnings("deprecation")
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, String url) {
                return handleUrl(Uri.parse(url));
            }

            @Override
            public void onPageStarted(WebView view, String url, Bitmap favicon) {
                if (isGameUrl(url)) showingOffline = false;
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                if (!showingOffline) hideBoot();
            }

            @Override
            public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                if (request.isForMainFrame()) showOffline(error.getDescription() != null ? error.getDescription().toString() : "No connection");
            }

            @SuppressWarnings("deprecation")
            @Override
            public void onReceivedError(WebView view, int errorCode, String description, String failingUrl) {
                if (failingUrl != null && isGameUrl(failingUrl)) showOffline(description);
            }

            @Override
            public void onReceivedHttpError(WebView view, WebResourceRequest request, WebResourceResponse errorResponse) {
                if (request.isForMainFrame() && errorResponse.getStatusCode() >= 500) {
                    showOffline("The sky is closed (HTTP " + errorResponse.getStatusCode() + ")");
                }
            }
        });

        web.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onConsoleMessage(ConsoleMessage m) {
                Log.d(TAG, m.messageLevel() + " " + m.message() + " @" + m.lineNumber());
                return true;
            }

            @Override
            public void onProgressChanged(WebView view, int newProgress) {
                if (bootStatus != null && !bootHidden) {
                    bootStatus.setText(newProgress < 100 ? "BOARDING · " + newProgress + "%" : "WHEELS UP");
                }
            }

            @Override
            public void onPermissionRequest(PermissionRequest request) {
                request.deny();
            }

            @Override
            public boolean onShowFileChooser(WebView webView, ValueCallback<Uri[]> filePathCallback, FileChooserParams params) {
                if (pendingFileChooser != null) pendingFileChooser.onReceiveValue(null);
                pendingFileChooser = filePathCallback;
                Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT);
                intent.addCategory(Intent.CATEGORY_OPENABLE);
                intent.setType("*/*");
                intent.putExtra(Intent.EXTRA_MIME_TYPES, new String[]{"application/json", "text/plain", "application/octet-stream"});
                try {
                    startActivityForResult(Intent.createChooser(intent, "Import save file"), REQ_FILE_CHOOSER);
                } catch (ActivityNotFoundException e) {
                    pendingFileChooser = null;
                    Toast.makeText(MainActivity.this, "No file picker available", Toast.LENGTH_SHORT).show();
                    return false;
                }
                return true;
            }
        });

        // Save exports are blob: URLs — pull them through JS into the native share sheet.
        web.setDownloadListener(new DownloadListener() {
            @Override
            public void onDownloadStart(String url, String userAgent, String contentDisposition, String mimeType, long contentLength) {
                if (url.startsWith("blob:")) {
                    String name = guessFileName(contentDisposition, mimeType);
                    web.evaluateJavascript(
                        "(function(){try{var x=new XMLHttpRequest();x.open('GET','" + url + "',true);x.responseType='blob';" +
                        "x.onload=function(){var r=new FileReader();r.onloadend=function(){var b=r.result.split(',')[1];" +
                        "JetstreamNative.saveFile('" + name + "',b,'" + mimeType + "');};r.readAsDataURL(x.response);};x.send();}catch(e){JetstreamNative.toast('Export failed: '+e);}})();",
                        null);
                } else if (url.startsWith("data:")) {
                    int comma = url.indexOf(',');
                    if (comma > 0) saveAndShare(guessFileName(contentDisposition, mimeType), url.substring(comma + 1), mimeType);
                } else {
                    openExternal(Uri.parse(url));
                }
            }
        });
    }

    private String guessFileName(String contentDisposition, String mime) {
        String name = "jetstream-save.json";
        if (contentDisposition != null) {
            int i = contentDisposition.indexOf("filename=");
            if (i >= 0) name = contentDisposition.substring(i + 9).replace("\"", "").trim();
        }
        if (!name.contains(".")) name += (mime != null && mime.contains("json")) ? ".json" : ".bin";
        return name.replaceAll("[^A-Za-z0-9._-]", "_");
    }

    private boolean isGameUrl(String url) {
        if (url == null) return false;
        Uri u = Uri.parse(url);
        return u.getHost() != null && u.getHost().equalsIgnoreCase(appHost);
    }

    /** Keep the game in-app; hand everything else (mailto, external sites) to the system. */
    private boolean handleUrl(Uri uri) {
        if (uri == null) return false;
        String scheme = uri.getScheme();
        if ("https".equals(scheme) && appHost.equalsIgnoreCase(uri.getHost())) return false;
        if ("http".equals(scheme) && appHost.equalsIgnoreCase(uri.getHost())) {
            web.loadUrl(uri.buildUpon().scheme("https").build().toString());
            return true;
        }
        openExternal(uri);
        return true;
    }

    private void openExternal(Uri uri) {
        try {
            startActivity(new Intent(Intent.ACTION_VIEW, uri));
        } catch (ActivityNotFoundException e) {
            Toast.makeText(this, "Nothing can open that link", Toast.LENGTH_SHORT).show();
        }
    }

    private void loadGame() {
        showingOffline = false;
        if (!isOnline()) {
            showOffline("No connection");
            return;
        }
        web.loadUrl(appUrl);
    }

    private boolean isOnline() {
        try {
            ConnectivityManager cm = (ConnectivityManager) getSystemService(Context.CONNECTIVITY_SERVICE);
            NetworkInfo n = cm != null ? cm.getActiveNetworkInfo() : null;
            return n != null && n.isConnected();
        } catch (Exception e) {
            return true;
        }
    }

    private void showOffline(String reason) {
        showingOffline = true;
        hideBoot();
        String safe = reason == null ? "" : reason.replace("'", "\\'");
        web.loadUrl("file:///android_asset/offline.html#" + Uri.encode(safe));
    }

    // ------------------------------------------------------------------ Boot screen

    private View buildBootScreen() {
        FrameLayout f = new FrameLayout(this);
        f.setBackgroundColor(0xFF070B12);
        f.setClickable(true);

        LinearLayout col = new LinearLayout(this);
        col.setOrientation(LinearLayout.VERTICAL);
        col.setGravity(Gravity.CENTER);
        FrameLayout.LayoutParams lp = new FrameLayout.LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT, Gravity.CENTER);
        f.addView(col, lp);

        ImageView logo = new ImageView(this);
        logo.setImageResource(R.mipmap.splash_logo);
        int size = dp(220);
        col.addView(logo, new LinearLayout.LayoutParams(size, size));

        ProgressBar spinner = new ProgressBar(this);
        spinner.setIndeterminate(true);
        LinearLayout.LayoutParams sp = new LinearLayout.LayoutParams(dp(28), dp(28));
        sp.topMargin = dp(18);
        col.addView(spinner, sp);

        bootStatus = new TextView(this);
        bootStatus.setText("BOARDING");
        bootStatus.setTextColor(0xFF22D3EE);
        bootStatus.setTextSize(11);
        bootStatus.setTypeface(Typeface.MONOSPACE, Typeface.BOLD);
        bootStatus.setLetterSpacing(0.3f);
        bootStatus.setGravity(Gravity.CENTER);
        LinearLayout.LayoutParams tp = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        tp.topMargin = dp(16);
        col.addView(bootStatus, tp);

        return f;
    }

    private void hideBoot() {
        if (bootHidden || boot == null) return;
        bootHidden = true;
        ObjectAnimator fade = ObjectAnimator.ofFloat(boot, "alpha", 1f, 0f);
        fade.setDuration(420);
        fade.setStartDelay(150);
        fade.start();
        ui.postDelayed(new Runnable() {
            @Override public void run() { if (boot != null) { root.removeView(boot); boot = null; } }
        }, 620);
    }

    private int dp(int v) {
        return Math.round(v * getResources().getDisplayMetrics().density);
    }

    // ------------------------------------------------------------------ Immersive

    private void applyImmersive() {
        View d = getWindow().getDecorView();
        d.setSystemUiVisibility(
            View.SYSTEM_UI_FLAG_LAYOUT_STABLE
            | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
            | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
            | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
            | View.SYSTEM_UI_FLAG_FULLSCREEN
            | View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY);
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) applyImmersive();
    }

    // ------------------------------------------------------------------ Lifecycle

    @Override
    protected void onResume() {
        super.onResume();
        if (web != null) web.onResume();
        if (showingOffline && isOnline()) loadGame();
    }

    @Override
    protected void onPause() {
        if (web != null) web.onPause();
        super.onPause();
    }

    @Override
    protected void onSaveInstanceState(Bundle outState) {
        super.onSaveInstanceState(outState);
        if (web != null) web.saveState(outState);
    }

    @Override
    protected void onDestroy() {
        if (web != null) {
            root.removeView(web);
            web.destroy();
            web = null;
        }
        super.onDestroy();
    }

    @Override
    public boolean onKeyDown(int keyCode, KeyEvent event) {
        if (keyCode == KeyEvent.KEYCODE_BACK && web != null) {
            if (showingOffline) { loadGame(); return true; }
            if (web.canGoBack()) { web.goBack(); return true; }
            long now = System.currentTimeMillis();
            if (now - lastBackPress < 2000) {
                moveTaskToBack(true);
            } else {
                lastBackPress = now;
                Toast.makeText(this, "Press back again to leave the cockpit", Toast.LENGTH_SHORT).show();
            }
            return true;
        }
        return super.onKeyDown(keyCode, event);
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        if (requestCode == REQ_FILE_CHOOSER) {
            if (pendingFileChooser != null) {
                Uri[] result = null;
                if (resultCode == RESULT_OK && data != null && data.getData() != null) result = new Uri[]{data.getData()};
                pendingFileChooser.onReceiveValue(result);
                pendingFileChooser = null;
            }
            return;
        }
        super.onActivityResult(requestCode, resultCode, data);
    }

    // ------------------------------------------------------------------ Files

    private void saveAndShare(String name, String base64, String mime) {
        try {
            File dir = new File(getFilesDir(), "exports");
            if (!dir.exists()) dir.mkdirs();
            File out = new File(dir, name);
            byte[] bytes = Base64.decode(base64, Base64.DEFAULT);
            OutputStream os = new FileOutputStream(out);
            os.write(bytes);
            os.close();
            Uri uri = SaveFileProvider.uriFor(out);
            Intent share = new Intent(Intent.ACTION_SEND);
            share.setType(mime != null && mime.length() > 0 ? mime : "application/json");
            share.putExtra(Intent.EXTRA_STREAM, uri);
            share.putExtra(Intent.EXTRA_SUBJECT, name);
            share.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            startActivity(Intent.createChooser(share, "Save your JETSTREAM backup"));
        } catch (Exception e) {
            Log.e(TAG, "export failed", e);
            Toast.makeText(this, "Export failed: " + e.getMessage(), Toast.LENGTH_LONG).show();
        }
    }

    // ------------------------------------------------------------------ JS bridge

    private class NativeBridge {
        @JavascriptInterface
        public boolean isNative() { return true; }

        @JavascriptInterface
        public String getVersion() { return VERSION; }

        @JavascriptInterface
        public void vibrate(final int ms) {
            try {
                Vibrator v = (Vibrator) getSystemService(Context.VIBRATOR_SERVICE);
                if (v != null && v.hasVibrator()) v.vibrate(Math.max(5, Math.min(200, ms)));
            } catch (Exception ignored) { }
        }

        @JavascriptInterface
        public void toast(final String msg) {
            ui.post(new Runnable() { @Override public void run() { Toast.makeText(MainActivity.this, msg, Toast.LENGTH_SHORT).show(); } });
        }

        @JavascriptInterface
        public void saveFile(final String name, final String base64, final String mime) {
            ui.post(new Runnable() { @Override public void run() { saveAndShare(name, base64, mime); } });
        }

        @JavascriptInterface
        public void reload() {
            ui.post(new Runnable() { @Override public void run() { loadGame(); } });
        }

        @JavascriptInterface
        public void openExternal(final String url) {
            ui.post(new Runnable() { @Override public void run() { MainActivity.this.openExternal(Uri.parse(url)); } });
        }
    }
}
