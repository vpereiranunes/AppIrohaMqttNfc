import React, { useEffect, useState } from 'react';
import { StyleSheet,View, Text,Image,TouchableOpacity,Button} from 'react-native';
import NfcManager, { NfcTech, Ndef } from 'react-native-nfc-manager';
import AsyncStorage from '@react-native-async-storage/async-storage';
import init from 'react_native_mqtt';
import { Alert } from 'react-native';

const logoActv='../images/nfcactive.png';
const logoUnactv='../images/nfcnotactive.png';
const logoTop='../images/irohalogo.png';

init({
  size: 10000,
  storageBackend: AsyncStorage,
  defaultExpires: 1000 * 3600 * 24, // 24 horas
  enableCache: true,
  reconnect: true,
  sync: {},
});

const client = new Paho.MQTT.Client('ws://broker.emqx.io:8083/mqtt', 'IrohaMqttClient');




const ConsultarScreen = () => {

  const [tagContent, setTagContent] = useState('');
  const [tagId, setTagId] = useState('');
  const [isReading, setIsReading] = useState(false);
  const [imageSource, setImageSource] = useState(require(logoUnactv));
  const [messageArrived, setMessage] = useState('');
  const [isJson,setIsJson]=useState(false);
  const [isConnected,setConnected]=useState(false);
  const [showRegisterPrompt, setShowRegisterPrompt] = useState(false);

  client.onConnectionLost = (responseObject) => {
    if (responseObject.errorCode !== 0) {
      console.log('Conexão perdida: ' + responseObject.errorMessage);
      setConnected(false)
    }
  };
      
  const connectClient = () => {
    client.connect({
      onSuccess: () => {
      console.log('Conectado ao broker MQTT!');
      setConnected(true)
      client.subscribe('IrohaMqtt/ClientResponse');
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
      if (messageArrived==='Tag não registrada') {

        setShowRegisterPrompt(true);
      } else {
        console.log('Mensagem diferente, conteúdo: ' + messageArrived)
        setShowRegisterPrompt(false);
      }
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

      onMessageArrived(messageArrived);
      return () => {
          NfcManager.cancelTechnologyRequest()
      };
  }, []);

  const readNfcTag = async () => {
    try {
      await NfcManager.requestTechnology(NfcTech.Ndef);
      const tag = await NfcManager.getTag();

      setTagId(tag.id);
      const ndef = tag.ndefMessage;

      if (ndef && ndef.length > 0) {
        const payloadBytes = ndef[0].payload;
        const decodedText = Ndef.text.decodePayload(payloadBytes);
        setTagContent(decodedText);

        // const payload = `Tag ID: ${tag.id}, Payload: ${decodedText}`;
        const payload= {
          transaction: 'Consulta',
          tag_id: tagId,
          domain_id: 'MAPL',
          status: decodedText,
          timestamp: new Date().toISOString(),
          status: 'read_success',
        };
        const mqttMessage = new Paho.MQTT.Message(JSON.stringify(payload));
        mqttMessage.destinationName = 'IrohaMqtt/ClientListener';
        client.send(mqttMessage);
        console.log('Dados enviados via MQTT: ' + payload);
      }
    } catch (ex) {
      console.warn(ex);
    } finally {
      NfcManager.cancelTechnologyRequest();
      setIsReading(false);
      setImageSource(require(logoUnactv));
    }
  };

  const handlePress = () => {
    if (!isReading) {
      setIsReading(true);
      if (!isConnected) {connectClient();}
      setImageSource(require(logoActv)); // mudar a imagem
      readNfcTag(); // iniciar leitura NFC
    }
  };

  const onMessageArrived = (message) => {
    // Verifica o conteúdo da mensagem
    if (message === 'Tag não registrada') {
      // Exibe o alerta com a pergunta e os botões
      Alert.alert(
        'Tag não registrada',
        'Deseja registrar?',
        [
          {
            text: 'Não',
            onPress: () => console.log('Usuário escolheu não registrar'),
            style: 'cancel',
          },
          {
            text: 'Sim',
            onPress: () => handleRegister(),
          },
        ],
        { cancelable: false }
      );
    }
  };

  const handleRegister= () => {
    console.log('Registrando a tag: ' + tagId);
    const payload= {
      transaction: 'RegisterAccount',
      tag_id: tagId,
      domain_id: 'MAPL',
      timestamp: new Date().toISOString(),
    };

    const mqttMessage = new Paho.MQTT.Message(JSON.stringify(payload));
    mqttMessage.destinationName = 'IrohaMqtt/ClientListener';
    client.send(mqttMessage);
    setShowRegisterPrompt(false);
  };

  const handleCancelRegister = () => {
    console.log('Usuário escolheu não registrar');
    setShowRegisterPrompt(false);
  };

  return (
    <View style={styles.container}>
      <View>
        <Image source={require(logoTop)} style={{width:200,height:100}} />
      </View>
      
      {/* <Text style={MqttConnected ? styles.connectedText : styles.disconnectedText}>
          {MqttConnected ? 'MQTT Conectado' : 'MQTT Desconectado'}
      </Text> */}
      <View style={tagId? styles.frame: styles.contentContainer}>
        {tagId ? <Text style={styles.text}>TAG ID: {tagId || 'Vazio'}</Text> : null}
        {tagContent ? <Text style={styles.text}>Status: {tagContent || 'Vazio'}</Text> : null}
      </View>
      <View style={messageArrived ? styles.frame: styles.content}>
        <Text style={styles.title}>
          {messageArrived? 'Status Iroha: ': ''}
        </Text>
        <Text style={styles.content}>
          {messageArrived ? messageArrived:''}
        </Text>
      </View>
      {showRegisterPrompt && (
        <View style={{ marginTop: 20, padding: 10, borderWidth: 1, borderColor: '#ccc' }}>
          <Text style={{ fontSize: 16, marginBottom: 10 }}>Conta não registrada. Deseja registrar?</Text>
          <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
            <Button title="Sim" onPress={handleRegister} />
            <Button title="Não" onPress={handleCancelRegister} />
          </View>
        </View>
      )}
      <TouchableOpacity onPress={handlePress} style={styles.logoContainer}>
        <Image source={imageSource} style={styles.logo} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#f5f5f5', // azul escuro 821414
      justifyContent: 'space-between', // colocar o conteúdo no meio e a logo no final
      alignItems: 'center', // centralizar horizontalmente
    },
    contentContainer: {
      flex: 1,
      justifyContent: 'center', // centralizar verticalmente o conteúdo
      alignItems: 'flex-start', // alinhar o texto à esquerda
      marginLeft: 90,
      width: '80%', // ajustar a largura para alinhar o conteúdo à esquerda com espaço
    },
    logoContainer: {
      marginBottom: 120, // margem inferior para a logo
    },
    logo: {
      width: 100,
      height: 100,
    },
    text: {
      color: 'black',
      fontSize: 16,
      marginBottom: 10,
    },
    connectedText: {
        color: 'green',            // Texto em verde para quando estiver conectado
        fontSize: 12,              // Tamanho do texto
        fontWeight: 'bold',
    },
    disconnectedText: {
        color: 'red',              // Texto em vermelho para quando estiver desconectado
        fontSize: 12,              // Tamanho do texto
        fontWeight: 'regular',
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
        alignItems: 'flex-start'
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

export default ConsultarScreen;