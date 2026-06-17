from fastapi.testclient import TestClient
# On importe l'instance FastAPI de ton projet (ex: depuis main.py)
from main import app

client = TestClient(app)

def test_read_main():
    # Envoie une requête simulée à l'application
    response = client.get("/")
    assert response.status_code == 200
    assert response.json() == {"message": "Hello World"} # À adapter selon ton code
    print("\n✅ Le test unitaire a réussi !")

if __name__ == "__main__":
    test_read_main()