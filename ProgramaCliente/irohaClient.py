import iroha
import json

key_pair = iroha.KeyPair.from_json("""
{
  "public_key": "ed0120CE7FA46C9DCE7EA4B125E2E36BDB63EA33073E7590AC92816AE1E861B7048B03",
  "private_key": "802620CCF31D85E3B32A4BEA59987CE0C78E3B8E2DB93881468AB2435FE45D5C9DCD53"
}
""")

account_id = "ed0120CE7FA46C9DCE7EA4B125E2E36BDB63EA33073E7590AC92816AE1E861B7048B03@wonderland"
web_login = "mad_hatter"
password = "ilovetea"
api_url = "http://127.0.0.1:8080/"
telemetry_url = "http://127.0.0.1:8180/"
chain_id = "00000000-0000-0000-0000-000000000000"

client = iroha.Client.create(
            key_pair,
            account_id,
            web_login,
            password,
            api_url,
            chain_id)

def generate_public_key(seed):

    """
    Generate a public key using Ed25519PrivateKey.
    """
    return iroha.KeyPair.from_hex_seed(seed).public_key

registered_transaction = False

def register_domain(domain_name):
    
    domains = client.query_all_domains()

    if domain_name in domains:
        return "Domain '" + domain_name + "' already exists."
    else:
        register = iroha.Instruction.register_domain(domain_name)

        client.submit_executable([register])

        while True:
            domains = client.query_all_domains()
            
            if domain_name in domains:
                registered_transaction = True
                return "Domain registered successfuly."
                break

def register_account(public_key=None, domain_name=None, seed=None):
    
    domains = client.query_all_domains()
    if domain_name in domains:
        if not public_key:
            if not seed: seed="abcd1234"
            public_key = generate_public_key(seed)
        account_id= f"{public_key}@{domain_name}"
        accounts = client.query_all_accounts_in_domain(domain_name)
        if account_id in accounts:
            return "Account '" + account_id + "' already exists."
        else:
            print(account_id)
            register = iroha.Instruction.register_account(account_id)
            client.submit_executable([register])

            while True:
                accounts = client.query_all_accounts_in_domain(domain_name)
                
                if account_id in accounts:
                    return "Account registered successfuly."
                    break

    else:
        return "Domain '" + domain_name + "' doesn't exist."

def registra_status(status,tag_id,domain_name):
    status_reg=status.strip()
    new_account="ed0120CE7FA46C9DCE7EA4B125E2E36BDB63EA33073E7590AC92816AE1E861B7048B03@wonderland"
    public_key=generate_public_key(tag_id)
    account_id= f"{public_key}@{domain_name}"
    assets = client.query_all_assets_owned_by_account(account_id)
    asset_definition_id = f"{status_reg}#{domain_name}"
    asset_id = f"{status_reg}##{account_id}"
    if asset_id in assets:
        return "Status já é o atual"
    else:
        for a in assets:
            transfer=iroha.Instruction.transfer(1,a,new_account)
            client.submit_executable(transfer)
        register_definition = iroha.Instruction.register_asset_definition(asset_definition_id, iroha.AssetType.numeric_fractional(0))
        mint = iroha.Instruction.mint_asset(1, asset_id)
        client.submit_executable([mint])
        assets = client.query_all_assets_owned_by_account(account_id)
        if asset_id in assets:
            return f"Status {status_reg} registrado."
        else:
            return "Status não registrado."
    

def consulta_tag(tag_id,domain_name):
    public_key=generate_public_key(tag_id)
    account_id= f"{public_key}@{domain_name}"
    print('Tag: ' + tag_id)
    print('Domain: ' + domain_name)
    print('Conta: ' + account_id)
    accounts=client.query_all_accounts()
    if account_id in accounts:
        assets = client.query_all_assets_owned_by_account(account_id)
        for a in assets:
            asset=a
            asset= asset.split("#", 1)[0]
            message={
                "tag_id":  tag_id,
                "status": asset
            }
            return json.dumps(message)
    else:
        return "Tag não registrada"
    
# if __name__ == "__main__":
#     public_key=generate_public_key(seed="93B12EF6")
#     print(public_key)

#     # register_domain("MQTT")
