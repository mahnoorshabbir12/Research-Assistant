import requests
try:
    models = requests.get("https://openrouter.ai/api/v1/models").json()["data"]
    for m in models:
        if "free" in m["id"]:
            print(m["id"])
except Exception as e:
    print(e)
