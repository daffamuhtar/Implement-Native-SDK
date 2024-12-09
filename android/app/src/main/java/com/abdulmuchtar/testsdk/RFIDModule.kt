package com.abdulmuchtar.testsdk

import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothDevice // Add this import
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.widget.ArrayAdapter
import com.example.sdklibrary.zebra.BluetoothHandler
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule

class RFIDModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    private lateinit var bluetoothHelper: BluetoothHandler
    private var availableDevicesAdapter: ArrayAdapter<String>
    private var pairedDevicesAdapter: ArrayAdapter<String>

    init {
        availableDevicesAdapter = ArrayAdapter(reactContext, android.R.layout.simple_list_item_1)
        pairedDevicesAdapter = ArrayAdapter(reactContext, android.R.layout.simple_list_item_1)
        bluetoothHelper = BluetoothHandler(reactContext, availableDevicesAdapter, pairedDevicesAdapter)
    }

    override fun getName(): String {
        return "RFIDModule"
    }

    private fun sendEvent(eventName: String, params: WritableMap) {
        reactApplicationContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit(eventName, params)
    }

// Bluetooth Func
    @ReactMethod
    fun startDiscovery(promise: Promise) {
        try {
            if (BluetoothAdapter.getDefaultAdapter()?.isEnabled == true) {
                val filter = IntentFilter(BluetoothDevice.ACTION_FOUND)
                reactApplicationContext.registerReceiver(bluetoothReceiver, filter)
                bluetoothHelper.startDiscovery() // Start discovery without callback here
                promise.resolve("Discovery started")
            } else {
                promise.reject("BLUETOOTH_DISABLED", "Please enable Bluetooth")
            }
        } catch (e: Exception) {
            promise.reject("START_DISCOVERY_ERROR", e)
        }
    }

    @ReactMethod
    fun stopDiscovery(promise: Promise) {
        try {
            bluetoothHelper.stopDiscovery()
            reactApplicationContext.unregisterReceiver(bluetoothReceiver)
            promise.resolve("Discovery stopped")
        } catch (e: Exception) {
            promise.reject("STOP_DISCOVERY_ERROR", e)
        }
    }

    private val bluetoothReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context?, intent: Intent?) {
            val action: String? = intent?.action
            if (BluetoothDevice.ACTION_FOUND == action) {
                val device: BluetoothDevice? =
                    intent.getParcelableExtra(BluetoothDevice.EXTRA_DEVICE)
                device?.let {
                    val deviceName = it.name ?: "Unknown Device"
                    val deviceAddress = it.address
                    val params = Arguments.createMap()
                    params.putString("deviceName", deviceName)
                    params.putString("deviceAddress", deviceAddress)

                // Add the discovered device to availableDevicesAdapter
                availableDevicesAdapter.add("$deviceName - $deviceAddress")

                // Emit the device to JS
                sendEvent("DeviceDiscovered", params)
                }
            }
        }
    }

    @ReactMethod
    fun pairDevice(deviceAddress: String, promise: Promise) {
        try {
            bluetoothHelper.pairDeviceClick(deviceAddress)
            promise.resolve("Pairing with $deviceAddress initiated")
        } catch (e: Exception) {
            promise.reject("PAIRING_ERROR", e)
        }
    }

    private fun unpairDeviceClick(deviceAddress: String): Boolean {
        val bluetoothAdapter = BluetoothAdapter.getDefaultAdapter()
        val device = bluetoothAdapter.getRemoteDevice(deviceAddress)
        return try {
            val method = device.javaClass.getMethod("removeBond")
            method.invoke(device) as Boolean
        } catch (e: Exception) {
            e.printStackTrace()
            false
        }
    }

    @ReactMethod
    fun unpairDevice(deviceAddress: String, promise: Promise) {
        try {
            if (!BluetoothAdapter.checkBluetoothAddress(deviceAddress)) {
                promise.reject("INVALID_ADDRESS", "$deviceAddress is not a valid Bluetooth address")
                return
            }

            val result = unpairDeviceClick(deviceAddress)
            if (result) {
                promise.resolve("Unpairing with $deviceAddress was successful")
            } else {
                promise.reject("UNPAIRING_FAILED", "Failed to unpair device with address $deviceAddress")
            }
        } catch (e: Exception) {
            promise.reject("UNPAIRING_ERROR", e)
        }
    }

    @ReactMethod
    fun getAvailableDevices(promise: Promise) {
        try {
            val devices = mutableListOf<String>()
            for (i in 0 until availableDevicesAdapter.count) {
                devices.add(availableDevicesAdapter.getItem(i) ?: "")
            }
            promise.resolve(Arguments.fromList(devices))
        } catch (e: Exception) {
            promise.reject("FETCH_DEVICES_ERROR", e)
        }
    }

    @ReactMethod
    fun getPairedDevices(promise: Promise) {
        try {
            val devices = mutableListOf<String>()
            for (i in 0 until pairedDevicesAdapter.count) {
                devices.add(pairedDevicesAdapter.getItem(i) ?: "")
            }
            promise.resolve(Arguments.fromList(devices))
        } catch (e: Exception) {
            promise.reject("FETCH_PAIRED_DEVICES_ERROR", e)
        }
    }

}
