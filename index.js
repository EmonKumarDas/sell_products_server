const express = require('express');
const app = express();
const cors = require('cors');
const port = 5000;
const { MongoClient, ServerApiVersion } = require('mongodb');
require('dotenv').config();

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
    res.send('hello');
})


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.ljdbc6c.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run() {
    try {
        const phoneCategoriCollection = client.db("sellphone").collection("phoneCategori");

        app.get('/phoneCategori', async (req, res) => {
            const phoneCate = await phoneCategoriCollection.find({}).toArray();
            res.send(phoneCate)
        })

        app.get('/phoneCategori/:id', async (req, res) => {
            const query = {};
            const service = phoneCategoriCollection.find(query);
            const newservice = await service.toArray();
            const findServiceById = newservice.find(getService => getService._id == req.params.id)
            res.send(findServiceById);
          })

    } finally {

    }
}
run().catch(console.dir);



app.listen(port, () => {
    console.log(`listening on ${port}`);
})