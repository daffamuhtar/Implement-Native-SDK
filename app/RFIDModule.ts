import { NativeEventEmitter, NativeModules, ToastAndroid } from 'react-native';

const { RFIDModule } = NativeModules;

if (!RFIDModule) {
  throw new Error('RFIDModule not linked properly.');
}

const RFIDModuleEmitter = new NativeEventEmitter(RFIDModule);

const showToast = (message: string) => {
  ToastAndroid.show(message, ToastAndroid.SHORT);
};

const validateAddress = (deviceAddress: string): string => {
  const address = deviceAddress.split(' - ')[1]; // Extract part after ' - '
  if (!address || !/^([0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}$/.test(address)) {
    throw new Error('Invalid Bluetooth address format');
  }
  return address;
};

const handleState = async (
  action: () => Promise<string>,
  operation: string,
  onSuccess?: () => Promise<void>,
) => {
  try {
    // showToast(`${operation} initiated`);
    console.log(`${operation} -> initiated`);

    const result = await action();

    // showToast(`${operation} in process...`);
    console.log(`${operation} -> process`);

    if (onSuccess) {
      await onSuccess();
    }

    showToast(`${operation} successful`);
    console.log(`${operation} -> success:`, result);

    return result;
  } catch (error) {
    console.error(`Error during ${operation}:`, error);
    showToast(`${operation} failed`);
    throw error;
  }
};

const RFID = {
  startDiscovery: async () => {
    return handleState(() => RFIDModule.startDiscovery(), 'Start Discovery');
  },

  stopDiscovery: async () => {
    return handleState(() => RFIDModule.stopDiscovery(), 'Stop Discovery');
  },

  pairDevice2: async (deviceAddress: string) => {
    try {
      const address = validateAddress(deviceAddress);
      return handleState(
        () => RFIDModule.pairDevice(address),
        `Pairing ${address}`,
        async () => {
          // Refresh available devices after successful pairing
          await RFID.getAvailableDevices();
        },
      );
    } catch (error) {
      console.error('Error validating address for pairing:', error);
      throw error;
    }
  },

  pairDevice: async (deviceInfo: string) => {
    try {
      // Extract the Bluetooth address from the string
      const address = deviceInfo.split(' - ')[1]; // Assumes format "DeviceName - XX:XX:XX:XX:XX:XX"

      if (!address || !/^([0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}$/.test(address)) {
        throw new Error(`Invalid Bluetooth address format: ${deviceInfo}`);
      }
      const validateAddress = (deviceAddress: string): string => {
        const address = deviceAddress.split(' - ')[1]; // Extract part after ' - '
        if (!address || !/^([0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}$/.test(address)) {
          throw new Error('Invalid Bluetooth address format');
        }
        return address;
      };
      const result = await RFIDModule.pairDevice(address); // Pass the valid address
      console.log(`Pairing initiated for ${address}:`, result);
      return result;
    } catch (error) {
      console.error('Error pairing device:', error);
      throw error;
    }
  },

  unpairDevice: async (deviceAddress: string) => {
    try {
      // console.log('Unpairing device:', deviceAddress);
      // const address = validateAddress(deviceAddress);
      // console.log('validate device:', deviceAddress);

      return handleState(
        () => RFIDModule.unpairDevice(deviceAddress),
        `Unpairing ${deviceAddress}`,
        async () => {
          // Refresh paired devices after successful unpairing
          await RFID.getPairedDevices();
        },
      );
    } catch (error) {
      console.error('Error validating address for unpairing:', error);
      throw error;
    }
  },

  getAvailableDevices: async () => {
    try {
      const devices = await RFIDModule.getAvailableDevices();
      // console.log('Available devices:', devices);
      return devices;
    } catch (error) {
      console.error('Error fetching available devices:', error);
      throw error;
    }
  },

  getPairedDevices: async () => {
    try {
      const devices = await RFIDModule.getPairedDevices();
      // console.log('Paired devices:', devices);
      return devices;
    } catch (error) {
      console.error('Error fetching paired devices:', error);
      throw error;
    }
  },

  onDeviceDiscovered: (
    callback: (device: { deviceName: string; deviceAddress: string }) => void,
  ) => {
    const subscription = RFIDModuleEmitter.addListener(
      'DeviceDiscovered',
      callback,
    );
    return () => subscription.remove(); // Cleanup listener
  },
};

export default RFID;
