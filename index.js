require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();
const bodyParser = require('body-parser')
const mongoose = require('mongoose');
const dns = require('node:dns');
// Basic Configuration
const port = process.env.PORT || 3000;
const { Schema } = mongoose

const urlSchema = new Schema({
  original_url: String,
  short_url: String
})

const URL = mongoose.model("url", urlSchema)

app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }))

app.use((req, res, next) => {
  console.log(req.body)
  next()
})

app.use('/public', express.static(`${process.cwd()}/public`));

app.get('/', function(req, res) {
  res.sendFile(process.cwd() + '/views/index.html');
});

// POST API endpoint
app.post('/api/shorturl', function(req, res) {
  //check if the format of the url is valid
  if(!new RegExp(/^((https|http):\/\/www.)([a-z0-9]+).([a-z]+)(\/?$|\/[a-z0-9]+$)/ig).test(req.body.url)){
    return res.json({ error: 'invalid url' })
  }

  //look up the url 
  dns.lookup(req.body.url.replace(/^((https|http)?:\/\/(www\.)?)|(\/?$|\/[a-z0-9]+$)/g, ""), (err, adress, family) => {
    //check for errors
    if (err !== null) {
      return res.json(err?.code === 'ENOTFOUND' ? { error: 'url not found' } : { error: 'something went wrong' });
    }

    //check if the url alredy exist if so return the url else create new short url
    URL.findOne({ original_url:  req.body.url.replace(/\/?$/g, "")}).then((doc) => {
      if (doc) {
        return res.json({ original_url: doc.original_url, short_url: doc.short_url });
      }

      new URL({ original_url: req.body.url.replace(/\/?$/g, ""), short_url: crypto.randomUUID().slice(0, 8) + URL.length }).save().then(({ original_url, short_url }) => {
        return res.json({ original_url, short_url });
      }).catch(() => {
        return res.json({ error: 'something went wrong' })
      })
    })
  })
});

app.get('/api/shorturl/:url', function(req, res) {
  const { url } = req.params

  URL.findOne({ short_url: url }).then((doc) => {
    if(doc){
      return res.redirect(doc.original_url)
    } else {
      return res.json({error: "No short URL found for the given input"})
    }
  })
});

mongoose.connect(process.env.MONGO_URI).then(() => {
  app.listen(port, function() {
    console.log(`Listening on port ${port}`);
  });
})

