import json
import threading
import paho.mqtt.client as mqtt
import irohaClient

broker="broker.emqx.io"
port=8083
username="iroha"
password="MAPL"
# Variável global para comunicação entre threads
trigger_message = False
tx_message = ""
# Função de callback quando uma mensagem é recebida
def on_message(client, userdata, message):
    global trigger_message
    global tx_message
    received_message = json.loads(message.payload.decode('utf-8'))
    print(f"Mensagem recebida no tópico '{message.topic}': {received_message}")
    
    tx_type=received_message.get("transaction")
    
    # Verifica se a mensagem recebida é "teste"
    if tx_type !="":
        trigger_message = True  # Ativa o gatilho para enviar uma resposta
        match tx_type:
            case "RegisterDomain":
                domain_name=received_message.get("domain_id")
                tx_message=irohaClient.register_domain(domain_name)
            case "RegisterAccount":
                domain_name=received_message.get("domain_id")
                public_key = received_message.get("public_key") if "public_key" in received_message else None
                tag_id = received_message.get("tag_id") if "tag_id" in received_message else None
                tx_message=irohaClient.register_account(public_key=public_key,domain_name=domain_name,seed=tag_id)
            case "Consulta":
                tag_id=received_message.get("tag_id")
                domain_name=received_message.get("domain_id")
                tx_message=irohaClient.consulta_tag(tag_id,domain_name)
            case "RegisterStatus":
                status=received_message.get("status")
                tag_id=received_message.get("tag_id")
                domain_name=received_message.get("domain_id")
                tx_message=irohaClient.registra_status(status,tag_id,domain_name)
            case _:
                tx_message="Tipo desconhecido: " + tx_type
                print(tx_message)


# Função que fica ouvindo as mensagens MQTT (Thread 1)
def listen_mqtt(client):
    client.on_message = on_message
    client.connect(broker, port, 60)
    client.subscribe("IrohaMqtt/ClientListener")
    client.loop_forever()  # Loop para ficar ouvindo mensagens

# Função que envia uma mensagem padrão sempre que a mensagem "teste" for recebida (Thread 2)
def send_response(client):
    global trigger_message
    while True:
        if trigger_message:
            # Enviar mensagem padrão para o broker
            client.publish("IrohaMqtt/ClientResponse", "Received Message")
            print("ClientResponse: 'Received Message'\n")
            trigger_message = False  # Reseta o gatilho



def send_tx(client):
    global tx_message
    while True:
        if tx_message !="" and tx_message != None:
            # Enviar mensagem padrão para o broker
            client.publish("IrohaMqtt/ClientResponse", tx_message)
            print("PayloadMessage: " + tx_message + "\n")
            tx_message = ""  # Reseta o gatilho


# Função principal para iniciar as threads
def start_mqtt_threads():
    client = mqtt.Client(callback_api_version=mqtt.CallbackAPIVersion.VERSION2,transport="websockets")
    client.username_pw_set(username,password)
    # Cria as threads para ouvir e enviar mensagens
    listen_thread = threading.Thread(target=listen_mqtt, args=(client,))
    response_thread = threading.Thread(target=send_tx, args=(client,))
    # payload_thread = threading.Thread(target=send_tx, args=(client,))

    # Inicia as threads
    listen_thread.start()
    response_thread.start()
    # payload_thread.start()

    # Mantém o script principal aguardando o término das threads
    listen_thread.join()
    response_thread.join()
    # payload_thread.join()

if __name__ == "__main__":
    start_mqtt_threads()
