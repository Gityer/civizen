package com.civizen.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
  @Override
  public void onCreate(Bundle savedInstanceState) {
    registerPlugin(ApkUpdaterPlugin.class);
    registerPlugin(BiometricAuthPlugin.class);
    super.onCreate(savedInstanceState);
  }
}
