var express = require('express');
var router = express.Router();

const environment = process.env.NODE_ENV || 'development';
const configuration = require('../../../knexfile')[environment];
const database = require('knex')(configuration);
const fetch = require("node-fetch");
const Favorite = require("../../../lib/models/favorite")

async function fetchMusicData(info) {
  let url = `https://api.musixmatch.com/ws/1.1/track.search?q_track=${info["title"]}&q_artist=${info["artistName"]}&s_artist_rating=desc&s_track_rating=desc&page_size=1&apikey=${process.env.MM_KEY}`
  let data = await fetch(url)
    .then(response => response.json())
    .then(result => {
        return result.message.body.track_list;
    })
    .catch((error) => response.send(500).json({ error: error }))
    return data;
}

router.post('/', (request, response) => {
  const info = request.body;

  for (let requiredParameter of ["title", "artistName"]) {
    if (!info[requiredParameter]) {
      return response
        .status(422)
        .send({ "error": `Expected format: { title: <string>, artistName: <string> }. You are missing a ${requiredParameter} property.`})
    }
  }

  let musicData = fetchMusicData(info)
    .then(data => {
      if(data.length === 0) {
        response.status(400).json({
          "error": "Unable to create favorite.",
          "detail": "No tracks were found from your search."
        })
      } else {
        let newFavorite = new Favorite(data[0].track)

        database('favorites')
          .insert(newFavorite, ["id", "title", "artistName", "genre", "rating"])
            .then(favoriteInfo =>{
              response.status(201).send(favoriteInfo[0])
            })
      }
    })
    .catch((error) => response.status(500).json({error: error}))
});

module.exports = router;