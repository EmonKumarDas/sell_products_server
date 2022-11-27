const express = require('express');
const app = express();
const cors = require('cors');
const port = 5000;
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
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
        const userCollection = client.db("sellphone").collection("user");
        const phonesCollection = client.db("sellphone").collection("phones");
        const brandCollection = client.db("sellphone").collection("brand");
        const wistlistCollection = client.db("sellphone").collection("wistlist");


        app.post('/wistlist', async (req, res) => {
            const wist = req.body;
            const wistlist = wistlistCollection.insertOne(wist);
            res.send(wistlist);
        })

        app.get('/wistlist', async (req, res) => {
            let query = {};
            if (req.query.buyer_email) {
                query = {
                    buyer_email: req.query.buyer_email
                }
            }
            const cursor = wistlistCollection.find(query);
            const phones = await cursor.toArray();
            res.send(phones)
        })

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

        // get phones by user email
        app.get('/getphones', async (req, res) => {
            let query = {};
            if (req.query.email) {
                query = {
                    email: req.query.email
                }
            }
            const cursor = phonesCollection.find(query);
            const phones = await cursor.toArray();
            res.send(phones)
        })

        // get phones by brand
        app.get('/phones/:brand', async (req, res) => {
            const query = {};
            const service = phonesCollection.find(query);
            const newphone = await service.toArray();
            const phones = newphone.filter(getphone => getphone.brand === req.params.brand)
            res.send(phones);
        })

        // post phones
        app.post('/phones', async (req, res) => {
            const phone = req.body;
            const phones = await phonesCollection.insertOne(phone);
            res.send(phones);
        })

        // get brand
        app.get('/brand', async (req, res) => {
            const brand = await brandCollection.find({}).toArray();
            res.send(brand);
        })

        app.post('/users', async (req, res) => {
            const user = req.body;
            const result = await userCollection.insertOne(user);
            res.send(result);
        })

        app.get('/users', async (req, res) => {
            const users = await userCollection.find({}).toArray();
            res.send(users);
        })

        // get blue tick for buyer
        app.get('/GetAprroveBuyer', async (req, res) => {
            let query = {};
            if (req.query.email) {
                query = {
                    email: req.query.email
                }
            }
            const cursor = userCollection.find(query);
            const buyer = await cursor.toArray();
            res.send(buyer)
        })

        // make seller role
        app.put('/user/seller/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) }
            const option = { upsert: true };
            const updateDoc = {
                $set: {
                    role: 'isSeller',
                }
            }
            const result = await userCollection.updateOne(filter, updateDoc, option);
            res.send({ result })
        })

        // check is seller
        app.get('/user/seller/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email };
            const user = await userCollection.findOne(query);
            res.send({ IsSeller: user.role == 'isSeller' });
        })

    } finally {

    }
}
run().catch(console.dir);



app.listen(port, () => {
    console.log(`listening on ${port}`);
})