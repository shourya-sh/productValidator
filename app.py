from flask import Flask, request, jsonify
from flask_cors import CORS
import torch
import clip
from PIL import Image
import requests
from io import BytesIO
from trutext import truncate_description
from similarity import cosine_similarity


app = Flask(__name__)
CORS(app)  # <-- Enables CORS for all domains and routes

# Load CLIP model
device = "cuda" if torch.cuda.is_available() else "cpu"
model, preprocess = clip.load("ViT-B/32", device=device)



@app.route("/receive-data", methods=["POST"])
def receive_data():
    data = request.get_json()
    print("received data", data)

    image_url = data.get("imageUrl")
    description = data.get("description")

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

    title = data.get("title", "")
    description = data.get("description", "")
    truncated_desc = truncate_description(description)
    truncated_title = truncate_description(title)

    desc_input = clip.tokenize(truncated_desc).to(device)
    title_input = clip.tokenize(truncated_title).to(device)

    with torch.no_grad():
        image_features = model.encode_image(image_input)
        desc_features = model.encode_text(desc_input)
        title_features = model.encode_text(title_input)


    # Convert to list for JSON serialization
    similarity_desc = cosine_similarity(
        image_features.cpu().numpy().tolist()[0],
        desc_features.cpu().numpy().tolist()[0]
    )

    similarity_title = cosine_similarity(
        image_features.cpu().numpy().tolist()[0],
        title_features.cpu().numpy().tolist()[0]
    )

    return jsonify({
        "similarity_description": similarity_desc,
        "similarity_title": similarity_title
    })




if __name__ == "__main__":
    app.run(debug=True)