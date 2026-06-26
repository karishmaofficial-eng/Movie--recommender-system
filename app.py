from flask import Flask, render_template, jsonify, request
import json
import os

app = Flask(__name__)

# Load precomputed datasets
MOVIES_FILE = 'movies_list.json'
RECS_FILE = 'recommendations.json'

movies_list = []
movies_map = {}
recommendations_map = {}

def load_datasets():
    global movies_list, movies_map, recommendations_map
    
    if not os.path.exists(MOVIES_FILE) or not os.path.exists(RECS_FILE):
        print("Warning: Dataset files not found. Run preprocess.py first.")
        return
        
    try:
        with open(MOVIES_FILE, 'r', encoding='utf-8') as f:
            movies_list = json.load(f)
            # Create a lookup map by title
            movies_map = {m['title'].strip().lower(): m for m in movies_list}
            print(f"Loaded {len(movies_list)} movies details.")
            
        with open(RECS_FILE, 'r', encoding='utf-8') as f:
            raw_recs = json.load(f)
            # Standardize keys to lowercase for robust lookup
            recommendations_map = {k.strip().lower(): v for k, v in raw_recs.items()}
            print(f"Loaded {len(recommendations_map)} movie recommendations.")
    except Exception as e:
        print(f"Error loading JSON data: {e}")

# Initial load
load_datasets()

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/api/movies', methods=['GET'])
def get_movies():
    # Return a list of all titles for autocomplete suggestions
    titles = [m['title'] for m in movies_list]
    return jsonify(titles)

@app.route('/api/recommend', methods=['GET'])
def get_recommendation():
    title_query = request.args.get('title', '').strip().lower()
    
    if not title_query:
        return jsonify({"error": "No movie title provided"}), 400
        
    # Look up the movie details
    movie_info = movies_map.get(title_query)
    if not movie_info:
        return jsonify({"error": f"Movie '{request.args.get('title')}' not found"}), 404
        
    # Get recommendations
    recs = recommendations_map.get(title_query, [])
    
    # Enrich the recommended movies with their metadata from movies_map
    enriched_recs = []
    for r in recs:
        rec_title_key = r['title'].strip().lower()
        details = movies_map.get(rec_title_key)
        if details:
            enriched_recs.append({
                "id": r['id'],
                "title": details['title'],
                "overview": details['overview'],
                "genres": details['genres'],
                "cast": details['cast'],
                "director": details['director'],
                "score": r['score']
            })
        else:
            # Fallback if metadata not found
            enriched_recs.append({
                "id": r['id'],
                "title": r['title'],
                "overview": "",
                "genres": [],
                "cast": [],
                "director": "",
                "score": r['score']
            })
            
    return jsonify({
        "movie": movie_info,
        "recommendations": enriched_recs
    })

if __name__ == '__main__':
    # Reload datasets on startup
    load_datasets()
    # Run server locally on port 5000
    app.run(debug=True, host='127.0.0.1', port=5000)
