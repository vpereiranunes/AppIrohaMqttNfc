import React, { useEffect, useState } from 'react';
import { StyleSheet,View, Text, Button, TextInput,Image,TouchableOpacity} from 'react-native';
import NfcManager, { NfcTech, Ndef } from 'react-native-nfc-manager';
import AsyncStorage from '@react-native-async-storage/async-storage';
import init from 'react_native_mqtt';

const logoTop='../images/irohalogo.png';
const logoActv='../images/nfcactive.png';
const logoUnactv='../images/nfcnotactive.png';

init({
    size: 10000,
    storageBackend: AsyncStorage,
    defaultExpires: 1000 * 3600 * 24, // 24 horas
    enableCache: true,
    reconnect: true,
    sync: {},
});

const client = new Paho.MQTT.Client('ws://broker.emqx.io:8083/mqtt', 'IrohaMqttClient');




const RegistrarScreen = () => {
  const [inputMessage, setInputMessage] = useState('');
  const [messageArrived, setMessage] = useState('');
  const [isWriting, setIsWriting] = useState(false);
  const [imageSource, setImageSource] = useState(require(logoUnactv));
  const [isJson,setIsJson]=useState(false);
  const [tagId, setTagId] = useState('');
  const [tagContent, setTagContent] = useState('');
  const [isConnected,setConnected]=useState(false);

  client.onConnectionLost = (responseObject) => {
    if (responseObject.errorCode !== 0) {
        console.log('Conexão perdida: ' + responseObject.errorMessage);
        setConnected(false);
    }
    };
    
    const connectClient = () => {
        client.connect({
            onSuccess: () => {
            console.log('Conectado ao broker MQTT!');
            client.subscribe('IrohaMqtt/ClientResponse');
            setConnected(true);
            },
            
            userName: 'iroha',
            password: 'MAPL',
        });
    };

    client.onMessageArrived = (msg) => {
        console.log('Mensagem recebida: ' + msg.payloadString);
        const payload = msg.payloadString;
        console.log('Mensagem recebida: ' + payload);
        setMessage(payload);
        try {
            const jsonData = JSON.parse(payload);
            setIsJson(true); // É JSON
            setMessage(JSON.stringify(jsonData, null, 2));
        } catch (error) {
            setIsJson(false);
            setMessage(payload);
        }
        console.log(messageArrived);
      };

    
  useEffect(() => {
    
    connectClient();
    NfcManager.start();
    return () => {
        NfcManager.cancelTechnologyRequest()
    };
  }, []);

  const writeNfcTag = async () => {
    try {
        await NfcManager.requestTechnology(NfcTech.Ndef);

        const message = inputMessage;
        const messageBytes = Ndef.encodeMessage([Ndef.textRecord(message)]);

        await NfcManager.ndefHandler.writeNdefMessage(messageBytes);
        const tag = await NfcManager.getTag();
        setTagId(tag.id);
        console.log('Tag ID: ' + tag.id);
        setInputMessage('');
        console.log('Mensagem ' + message + ' escrita na tag com sucesso!');

        const messagemqtt= {
          transaction: 'RegisterStatus',
          tag_id: tag.id,
          domain_id:'MAPL',
          status: message,
          timestamp: new Date().toISOString()
        };

        const mqttMessage = new Paho.MQTT.Message(JSON.stringify(messagemqtt));
        mqttMessage.destinationName = 'IrohaMqtt/ClientListener';
        client.send(mqttMessage);
        console.log('Dados enviados via MQTT: ' + messagemqtt);
        
    } catch (ex) {
        if (ex==="[Error: AMQJS0011E Invalid state not connected.]"){
          connectClient();
          const tag = await NfcManager.getTag();
          const messagemqtt= {
            transaction: 'RegisterStatus',
            tag_id: tag.id,
            domain_id:'MAPL',
            status: inputMessage,
            timestamp: new Date().toISOString()
          };
  
          const mqttMessage = new Paho.MQTT.Message(JSON.stringify(messagemqtt));
          mqttMessage.destinationName = 'IrohaMqtt/ClientListener';
          client.send(mqttMessage);
          console.log('Dados enviados via MQTT: ' + messagemqtt);
        }else{
          console.warn('Falha ao escrever na tag:', ex);
        }
        
    } finally {
        NfcManager.cancelTechnologyRequest();
        setIsWriting(false);
        setImageSource(require(logoUnactv));
        
        // setTimeout(() => {
        //   readNfcTag();
        // }, 1200); 

    }
    
  };

  const handlePress = () => {
    if (!isWriting) {
      // if (!isConnected){connectClient()} 
      setIsWriting(true);
      setImageSource(require(logoActv)); // mudar a imagem
      writeNfcTag(); // iniciar leitura NFC
      // readNfcTag();
    }
  };
  
  return (
    <View style={styles.container}>
        <View>
          <Image source={require(logoTop)} style={styles.logoiroha} />
        </View>
        <View style={messageArrived ? styles.frame: styles.content}>
            <Text style={styles.title}>
                {messageArrived?'Mensagem Recebida: ': ''}
            </Text>
            <Text style={styles.content}>
                {messageArrived ? messageArrived:''}
            </Text>
        </View>
        <TextInput style={styles.textBox}
            placeholder="Digite a mensagem para a TAG"
            value={inputMessage}
            onChangeText={setInputMessage}
            placeholderTextColor="#999" 
        />
      <TouchableOpacity style={styles.button} onPress={(handlePress)}>
        <Text style={styles.buttonText}>Registrar TAG</Text>
      </TouchableOpacity>
        <TouchableOpacity style={styles.logoContainer}>
            <Image source={imageSource} style={styles.logo} />
        </TouchableOpacity>
      <Text>Texto: {inputMessage || 'Vazio'}</Text>
    </View>
  );
}


const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#f5f5f5', // Cor de fundo da tela
      },
    logoContainer: {
        marginBottom: 10,
    },
    logoiroha: {
        alignSelf: 'flex-start',
        width:200,
        height:100
    },
    logo: {
        width:100,
        height:100
    },
    textBox: {
        width: '80%',              // Largura da caixa de texto
        height: 50,                // Altura da caixa de texto
        backgroundColor: '#ffffff',    // Fundo branco
        borderColor: 'red',         // Borda vermelha
        borderWidth: 0,             // Largura da borda
        borderRadius: 10,           // Bordas arredondadas
        paddingHorizontal: 15,      // Espaçamento interno horizontal
        fontSize: 16,               // Tamanho do texto
        color: '#000',              // Cor do texto
        overflow: 'hidden',         // Garante que as bordas arredondadas sejam aplicadas corretamente
        justifyContent: 'center',
        alignItems: 'center',       // Centraliza os itens horizontalmente
    },
    button: {
        backgroundColor: '#bb1919',   // Fundo vermelho
        paddingVertical: 15,      // Espaçamento vertical
        paddingHorizontal: 30,    // Espaçamento horizontal
        borderRadius: 10,         // Bordas arredondadas
        justifyContent: 'center',
        alignItems: 'center',  
    },
      buttonText: {
        color: '#fff',            // Cor do texto branca
        fontSize: 16,             // Tamanho do texto
        fontWeight: 'bold',       // Texto em negrito
        textAlign: 'center',      // Texto centralizado
    },
    frame: {
        backgroundColor: 'white',  // Fundo branco
        padding: 20,               // Espaçamento interno do frame
        borderRadius: 15,          // Bordas arredondadas
        borderColor: '#ddd',       // Cor da borda (opcional)
        borderWidth: 2,            // Espessura da borda (opcional)
        shadowColor: '#000',       // Sombra (opcional)
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 5,              // Sombra no Android
        justifyContent: 'center', // centralizar verticalmente o conteúdo
        alignItems: 'flex-start',
        color: 'black',            // Texto em verde para quando estiver conectado
        fontSize: 15,  
      },
      content: {
        fontSize: 14,
        fontWeight: 'regular',
        color: 'black',
        textAlign: 'left',
      },
      title: {
        fontSize: 18,
        fontWeight: 'bold',
        color: 'black',
        textAlign: 'center',
      },
});

export default RegistrarScreen;
