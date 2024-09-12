import React, { useEffect, useState, PropsWithChildren } from 'react';
import {
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  useColorScheme,
  View,
  Alert,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { Colors, DebugInstructions, Header, LearnMoreLinks } from 'react-native/Libraries/NewAppScreen';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@env';
import Geolocation from 'react-native-geolocation-service'; // Importa la libreria
import { PermissionsAndroid, Platform } from 'react-native';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

import 'react-native-url-polyfill/auto';
import { Float } from 'react-native/Libraries/Types/CodegenTypes';

type SectionProps = PropsWithChildren<{
  title: string;
}>;

function Section({ children, title }: SectionProps): React.JSX.Element {
  const isDarkMode = useColorScheme() === 'dark';
  return (
    <View style={styles.sectionContainer}>
      <Text
        style={[
          styles.sectionTitle,
          {
            color: isDarkMode ? Colors.white : Colors.black,
          },
        ]}>
        {title}
      </Text>
      <Text
        style={[
          styles.sectionDescription,
          {
            color: isDarkMode ? Colors.light : Colors.dark,
          },
        ]}>
        {children}
      </Text>
    </View>
  );
}

function App(): React.JSX.Element {
  const [data, setData] = useState<any[]>([]);
  const [position, setPosition] = useState<{ lat: number; lng: number }>({ lat: 41.8992, lng: 12.5450 }); // Default Rome coordinates
  const apiKey = '3c0d0d2a926f4bc6ae8e6d75a3de0c1f';

  const requestLocationPermission = async () => {
    if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        {
          title: "Permesso di Geolocalizzazione",
          message: "L'app ha bisogno del permesso di geolocalizzazione.",
          buttonNeutral: "Chiedimi più tardi",
          buttonNegative: "Annulla",
          buttonPositive: "OK"
        }
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    }
    return true;
  };

  const getUserLocation = async () => {
    const hasPermission = await requestLocationPermission();
    if (!hasPermission) {
      Alert.alert("Permesso non concesso", "Non è possibile ottenere la posizione senza permesso.");
      return;
    }

    Geolocation.getCurrentPosition(
      (position) => {
        console.log('Posizione utente acquisita:', position);
        const { latitude, longitude } = position.coords;
        setPosition({ lat: latitude, lng: longitude });
      },
      (error) => {
        console.error('Errore nella geolocalizzazione:', error);
        Alert.alert('Errore', 'Impossibile ottenere la tua posizione.');
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 10000
      }
    );    
  };

  useEffect(() => {
    const fetchData = async () => {
      const { data: parkingData, error } = await supabase
        .from('utente')
        .select('*');

      if (error) {
        console.error(error);
      } else {
        setData(parkingData);
      }
    };

    fetchData();
    getUserLocation(); // Ottieni la posizione dell'utente
  }, []);

  // Aggiungi Supabase URL e Anon Key come costanti nel template HTML
  const thunderforestMapHtml = (supabaseUrl: string, supabaseAnonKey: string): string => `
  <!DOCTYPE html>
  <html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
      body, html, #map { margin: 0; padding: 0; height: 100%; }
    </style>
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.7.1/dist/leaflet.css" />
    <script src="https://unpkg.com/leaflet@1.7.1/dist/leaflet.js"></script>
  </head>
  <body>
    <div id="map"></div>
    <script>
      // Inizializza la mappa centrata sulla posizione dell'utente
      var map = L.map('map').setView([${position.lat}, ${position.lng}], 13);
      
      // Aggiungi il livello della mappa Thunderforest
      L.tileLayer('https://{s}.tile.thunderforest.com/cycle/{z}/{x}/{y}.png?apikey=${apiKey}', {
        maxZoom: 19,
      }).addTo(map);

      

      // Inizializza Supabase con i parametri passati
      const supabaseUrl = "${supabaseUrl}";
      const supabaseAnonKey = "${supabaseAnonKey}";

      // Testa il client Supabase
      console.log('Supabase URL:', supabaseUrl);
      console.log('Supabase Anon Key:', supabaseAnonKey);
    
      // Funzione per calcolare la distanza tra due coordinate geografiche
      function getDistance(lat1, lon1, lat2, lon2) {
        const R = 6371e3; // Raggio della Terra in metri
        const φ1 = lat1 * Math.PI / 180;
        const φ2 = lat2 * Math.PI / 180;
        const Δφ = (lat2 - lat1) * Math.PI / 180;
        const Δλ = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c; // Distanza in metri
      }
  
      // Funzione per recuperare i posti dal database e controllare se sono nel cerchio
      async function getPostiInCerchio(lat, lng, radius) {
        console.log("Checkpoint: Chiamata a Supabase iniziata");

        try {
          console.log("Supabase client:", supabase);
          console.log('WORKED');
          const { data: posti, error } = await supabase
            .from('posto')
            .select('*');

          if (error) {
            console.error('Errore nel recuperare i posti:', error);
            return [];
          }

          console.log('Posti recuperati dal database:', posti);

          const postiInCerchio = posti.filter((posto) => {
            const distanza = getDistance(lat, lng, posto.lat, posto.lon);
            return distanza <= radius;
          });
          console.log('WORKED');
          return postiInCerchio;
        } catch (err) {
          console.error("Errore nella chiamata a Supabase:", err);
          return [];
        }
      }
  
      // Aggiungi un marker alla posizione corrente
      var userMarker = L.marker([${position.lat}, ${position.lng}]).addTo(map)
        .bindPopup("Sei qui!")
        .openPopup();
  
      // Aggiungi un marker e un cerchio dove l'utente clicca
      map.on('click', async function(e) {
        var latLng = e.latlng;
        var marker = L.marker([latLng.lat, latLng.lng]).addTo(map);
        marker.bindPopup("Area parcheggio").openPopup();
        var circle = L.circle([latLng.lat, latLng.lng], {
          color: 'blue',
          fillColor: '#3f94eb',
          fillOpacity: 0.5,
          radius: 200
        }).addTo(map);
        map.setView([latLng.lat, latLng.lng], 17);
        
        // Recupera i posti all'interno del cerchio
        const posti = await getPostiInCerchio(latLng.lat, latLng.lng, 200);
  
        if (posti.length > 0) {
          let popupContent = '<b>Posti trovati:</b><br>';
          posti.forEach(posto => {
            popupContent += \`\${posto.id}, (\${posto.lat}, \${posto.lon})<br>\`;
          });
          marker.bindPopup(popupContent).openPopup();
        } else {
          marker.bindPopup(\`Nessun posto trovato in questa area<br>Lat: \${latLng.lat}<br>Lng: \${latLng.lng}\`).openPopup();
        }
      });
    </script>
  </body>
  </html>
  `;
  
  const isDarkMode = useColorScheme() === 'dark';
  const backgroundStyle = {
    backgroundColor: isDarkMode ? Colors.darker : Colors.lighter,
  };

  return (
    <SafeAreaView style={backgroundStyle}>
      <StatusBar
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor={backgroundStyle.backgroundColor}
      />
      <View style={styles.container}>
      <WebView
        originWhitelist={['https://*']}
        source={{ html: thunderforestMapHtml(SUPABASE_URL, SUPABASE_ANON_KEY) }}
        style={styles.map}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        onMessage={(event) => console.log(event.nativeEvent.data)}  // Per stampare messaggi nella console di React Native
        injectedJavaScript={`
          window.console.log = (message) => window.ReactNativeWebView.postMessage(message);
          true;
        `}
      />
      </View>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        style={backgroundStyle}>
        <View
          style={{
            backgroundColor: isDarkMode ? Colors.black : Colors.white,
          }}>
          <Section title="WELCOME">
            Welcome to <Text style={styles.highlight}>TAC</Text>! The new app to find parking easily.
          </Section>
          <Section title="Data from Backend">
            {data.length > 0 ? (
              data.map((item, index) => (
                <View key={index}>
                  <Text>Nome: {item.nome}</Text>
                  <Text>Cognome: {item.cognome}</Text>
                  <Text>Email: {item.email}</Text>
                </View>
              ))
            ) : (
              <Text>No data available</Text>
            )}
          </Section>
          <Section title="Debug">
            <DebugInstructions />
          </Section>
          <Section title="Learn More">
            Read the docs to discover what to do next:
          </Section>
          <LearnMoreLinks />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  sectionContainer: {
    marginTop: 32,
    paddingHorizontal: 24,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '600',
  },
  sectionDescription: {
    marginTop: 8,
    fontSize: 18,
    fontWeight: '400',
  },
  highlight: {
    fontWeight: '700',
  },
  container: {
    height: 400,
  },
  map: {
    flex: 1,
  },
});

export default App;
