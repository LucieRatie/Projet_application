import httpx

# L'URL locale par défaut de ton serveur FastAPI
BASE_URL = "http://127.0.0.1:8000"


def test_fastapi_server():
    print("🚀 Démarrage du test du serveur...")

    with httpx.Client(base_url=BASE_URL) as client:
        try:
            # 1. Test de la racine (GET /)
            print("\n👉 Test de la route principale (GET /) :")
            response = client.get("/")
            print(f"Statut : {response.status_code}")
            print(f"Réponse : {response.json()}")

            # 2. Test d'une autre route (Ex: GET /items/42?q=test)
            # Modifie cette partie selon les vraies routes de ton API !
            print("\n👉 Test d'une route avec paramètres (GET /items/42) :")
            response = client.get("/items/42", params={"q": "bouteille"})
            print(f"Statut : {response.status_code}")
            print(f"Réponse : {response.json()}")

        except httpx.ConnectError:
            print("\n❌ Erreur : Impossible de se connecter au serveur.")
            print("Vérifie que ton serveur FastAPI est bien lancé (`uvicorn main:app --reload`).")


if __name__ == "__main__":
    test_fastapi_server()