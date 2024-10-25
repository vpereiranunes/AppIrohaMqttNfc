import React from 'react';
// import React, { useEffect, useState } from 'react';
import { StyleSheet,View, Text, Button, TextInput,Image,TouchableOpacity } from 'react-native';
// import NfcManager, { NfcTech, Ndef } from 'react-native-nfc-manager';
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import init from 'react_native_mqtt';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Ionicons from 'react-native-vector-icons/Ionicons';
import RegistrarScreen from './Screens/Registrar';
import ConsultarScreen from './Screens/Consultar';


const Tab = createBottomTabNavigator();



const HomeScreen = () => {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Button title="Registrar TAG" onPress={() => navigation.navigate('Registrar')} />
      {/* <Button title="Consultar TAG" onPress={() => navigation.navigate('Consultar')} /> */}
    </View>
  );
}


const App = () => {
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          tabBarIcon: ({ focused, color, size }) => {
            let iconName;

            if (route.name === 'Consultar') {
              iconName = focused
                ? 'id-card'
                : 'id-card-outline';
            } else if (route.name === 'Registrar') {
              iconName = focused ? 'add-circle' : 'add-circle-outline';
            }

            // You can return any component that you like here!
            return <Ionicons name={iconName} size={size} color={color} />;
          },
          tabBarActiveTintColor: 'tomato',
          tabBarInactiveTintColor: 'gray',
        })}
      >
        <Tab.Screen name="Consultar" component={ConsultarScreen} />
        <Tab.Screen name="Registrar" component={RegistrarScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  );
};

export default App;
