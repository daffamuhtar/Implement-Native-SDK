import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Button,
  FlatList,
  StyleSheet,
  Alert,
  ScrollView,
  TextInput,
} from 'react-native';
import RFID from './RFIDModule'; // Ensure this path is correct

export default function HomeScreen() {
  const [availableDevices, setAvailableDevices] = useState<string[]>([]);
  const [pairedDevices, setPairedDevices] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');

  const fetchPairedDevices = async () => {
    setPairedDevices([]); // Clear paired devices before fetching
    try {
      const devices = await RFID.getPairedDevices();
      setPairedDevices(Array.from(new Set(devices))); // Ensure unique devices
    } catch (error) {
      console.error('Error fetching paired devices:', error);
    }
  };

  const fetchAndDiscoverDevices = async () => {
    try {
      const [availableDevices, pairedDevices] = await Promise.all([
        RFID.getAvailableDevices(),
        RFID.getPairedDevices(),
      ]);

      // Set paired devices with unique values
      const uniquePairedDevices: any = Array.from(new Set(pairedDevices));
      setPairedDevices(uniquePairedDevices);

      // Filter available devices by excluding paired device addresses
      const filteredAvailableDevices = availableDevices.filter(
        (device: any) => {
          const deviceAddress = device.split(' - ')[1];
          return !uniquePairedDevices.some(
            (pairedDevice: any) =>
              pairedDevice.split(' - ')[1] === deviceAddress,
          );
        },
      );

      setAvailableDevices(Array.from(new Set(filteredAvailableDevices)));

      // Start discovery for dynamic updates
      const unsubscribe = RFID.onDeviceDiscovered((device) => {
        const deviceEntry = `${device.deviceName || 'Unknown Device'} - ${
          device.deviceAddress
        }`;

        setAvailableDevices((prevDevices) => {
          const deviceMap = new Map(
            prevDevices.map((d) => [d.split(' - ')[1], d]),
          );
          deviceMap.set(device.deviceAddress, deviceEntry);

          return Array.from(deviceMap.values());
        });
      });

      await RFID.startDiscovery();
      return unsubscribe;
    } catch (error) {
      console.error('Error during fetch or discovery:', error);
    }
  };

  const filteredAvailableDevices = availableDevices.filter((device) =>
    device.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const filteredPairedDevices = pairedDevices.filter((device) =>
    device.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  useEffect(() => {
    let unsubscribe: any;
    // fetchPairedDevices();

    const loadDevices = async () => {
      unsubscribe = await fetchAndDiscoverDevices();
    };

    loadDevices();

    return () => {
      unsubscribe && unsubscribe();
      RFID.stopDiscovery().catch((error) =>
        console.error('Failed to stop discovery:', error),
      );
    };
  }, []);

  return (
    <ScrollView style={styles.container}>
      <View
        style={{
          flex: 1,
        }}
      >
        <TextInput
          style={styles.searchInput}
          placeholder="Search devices..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />

        <Button
          color={'green'}
          title="Scan Devices"
          onPress={() => {
            fetchPairedDevices();
            fetchAndDiscoverDevices();
          }}
        />

        <Text style={styles.header}>
          Available Devices ({filteredAvailableDevices.length}):
        </Text>
        <FlatList
          style={{ height: 300 }}
          data={filteredAvailableDevices}
          keyExtractor={(item) => item}
          renderItem={({ item, index }) => (
            <View style={styles.deviceItem}>
              <Text>
                {index + 1} - {item}
              </Text>
              <Button
                title="Pair"
                onPress={async () => {
                  try {
                    await RFID.pairDevice(item);
                    Alert.alert('Success', `Paired with ${item}`);
                    fetchPairedDevices(); // Refresh paired devices after pairing
                  } catch (error: any) {
                    Alert.alert(
                      'Error',
                      error.message || `Failed to pair with ${item}`,
                    );
                  }
                }}
              />
            </View>
          )}
          ListEmptyComponent={<Text>No available devices found.</Text>}
        />

        <Text style={styles.header}>
          Paired Devices ({filteredPairedDevices.length}):
        </Text>
        <FlatList
          data={filteredPairedDevices}
          keyExtractor={(item) => item}
          renderItem={({ item, index }) => (
            <View style={styles.deviceItem}>
              <Text>
                {index + 1} - {item}
              </Text>
              <Button
                color={'red'}
                title="Unpair"
                onPress={async () => {
                  try {
                    await RFID.unpairDevice(item.split(' - ')[1]);
                    Alert.alert('Success', `Unpaired from ${item}`);
                    fetchPairedDevices(); // Refresh paired devices after unpairing
                  } catch (error) {
                    Alert.alert('Error', `Failed to unpair ${item}`);
                  }
                }}
              />
            </View>
          )}
          ListEmptyComponent={<Text>No paired devices found.</Text>}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  searchInput: {
    height: 40,
    borderColor: '#ccc',
    borderWidth: 1,
    marginBottom: 10,
    paddingHorizontal: 8,
  },
  header: {
    fontSize: 18,
    fontWeight: 'bold',
    marginVertical: 10,
  },
  deviceItem: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
    marginBottom: 10,
  },
});
