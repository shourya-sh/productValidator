from flask import Flask, request, jsonify
from flask_cors import CORS
import torch
import clip
from PIL import Image
import requests
from io import BytesIO
from trutext import truncate_description

app = Flask(__name__)
CORS(app)  # <-- Enables CORS for all domains and routes

# Load CLIP model
device = "cuda" if torch.cuda.is_available() else "cpu"
model, preprocess = clip.load("ViT-B/32", device=device)



@app.route("/receive-data", methods=["POST"])
def receive_data():
    data = request.get_json()
    #print("received data", data)

    image_url = data.get("imageUrl")
    description = data.get("description")

    #print("📦 imageUrl:", image_url)
    #print("📦 description:", description)

    if not image_url or not description:
        print("❌ Missing required fields.")
        return jsonify({"error": "Missing imageUrl or description"}), 400

    try: 
        response = requests.get(image_url)
        image = Image.open(BytesIO(response.content)).convert("RGB")
    
    except Exception as e:
        return jsonify({"error": "Failed to load image: {str(e)}"}), 400

        # Generate embeddings
    image_input = preprocess(image).unsqueeze(0).to(device)

    truncated = truncate_description(description)
    text_input = clip.tokenize(truncated).to(device)

    with torch.no_grad():
        #print("encoding image")
        image_features = model.encode_image(image_input)
        #print("encoded image")

        #print("encoding text")
        text_features = model.encode_text(text_input)
        #print("encoded text")


    # Convert to list for JSON serialization
    image_embedding = image_features.cpu().numpy().tolist()[0]
    text_embedding = text_features.cpu().numpy().tolist()[0]

    print("image embedding", image_embedding)
    print("text embedding", text_embedding)

    return jsonify({
        "image_embedding": image_embedding,
        "text_embedding": text_embedding
    })

if __name__ == "__main__":
    app.run(debug=True)