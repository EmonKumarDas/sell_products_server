const express = require('express');
const app = express();
const cors = require('cors');
const port = 5000;
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();
const jwt = require('jsonwebtoken');
const stripe = require("stripe")(process.env.STRIPE_SECRET);

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
    res.send('hello');
})

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.ljdbc6c.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

function verifyJWT(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).send({ message: 'unauthorized access' })
    }
    const token = authHeader.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
        if (err) {
            return res.status(401).send({ message: 'unauthorized access' })
        }
        req.decoded = decoded;
        next();
    })

}

async function run() {
    try {
        const phoneCategoriCollection = client.db("sellphone").collection("phoneCategori");
        const userCollection = client.db("sellphone").collection("user");
        const phonesCollection = client.db("sellphone").collection("phones");
        const brandCollection = client.db("sellphone").collection("brand");
        const wistlistCollection = client.db("sellphone").collection("wistlist");
        const paymentCollection = client.db("sellphone").collection("payment");

        // payment 1st
        app.post('/create-payment-intent', async (req, res) => {
            const order = req.body;
            const price = order.price;
            const amount = price * 100;

            const paymentIntent = await stripe.paymentIntents.create({
                currency: 'usd',
                amount: amount,
                "payment_method_types": [
                    "card"
                ]
            });
            res.send({
                clientSecret: paymentIntent.client_secret,
            });
        });

        // send payment info to database
        app.post('/payments', async (req, res) => {
            const payment = req.body;
            const result = await paymentCollection.insertOne(payment);
            const id = payment.orderId
            const filter = { _id: ObjectId(id) }
            const updatedDoc = {
                $set: {
                    paid: true,
                    transactionId: payment.transactionId
                }
            }
            const updatedResult = await wistlistCollection.updateOne(filter, updatedDoc)
            res.send({result,updatedResult});
        })


        // jwt
        app.get('/jwt', async (req, res) => {
            const email = req.query.email;
            console.log(email);
            const query = { email: email };
            const user = await userCollection.findOne(query);
            if (user) {
                const token = jwt.sign({ email }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '5d' })
                return res.send({ accessToken: token });
            }
            res.status(403).send({ accessToken: '' })
        });

        app.post('/wistlist', async (req, res) => {
            const wist = req.body;
            const wistlist = wistlistCollection.insertOne(wist);
            res.send(wistlist);
        })

        app.get('/wistlist/:id', async (req, res) => {
            const query = {};
            const service = wistlistCollection.find(query);
            const newservice = await service.toArray();
            const findServiceById = newservice.find(getService => getService._id == req.params.id)
            res.send(findServiceById);
        })

        // get all seller
        app.get('/seller', async (req, res) => {
            const seller = await userCollection.find({}).toArray();
            res.send(seller);
        })


        // get buyer by email
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

        // get buyer product for seller
        app.get('/order/:seller_email', verifyJWT, async (req, res) => {
            const query = {};
            const service = wistlistCollection.find(query);
            const newphone = await service.toArray();
            const wistlist = newphone.filter(getphone => getphone.seller_email === req.params.seller_email)
            res.send(wistlist);
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
        // jwt
        app.get('/getphones', verifyJWT, async (req, res) => {
            // const email = req.query.email;
            // const decodedEmail = req.decoded.email;
            // if (email !== decodedEmail) {
            //     res.status(403).send({ message: 'forbidden access' })
            // }
            const decoded = req.decoded;
            if (decoded.email !== req.query.email) {
                res.status(403).send({ message: 'forbidden access' })
            }
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
        app.put('/user/seller/:id', verifyJWT, async (req, res) => {
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


        app.delete('/seller/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) };
            const result = await userCollection.deleteOne(filter);
            res.send(result);
        })

        const verifyAdmin = async (req, res, next) => {
            const decodedEmail = req.decoded.email;
            const query = { email: decodedEmail };
            const user = await usersCollection.findOne(query);

            if (user?.role !== 'isAdmin') {
                return res.status(403).send({ message: 'forbidden access' })
            }
            next();
        }

        // make Admin role
        app.put('/user/admin/:id', verifyJWT, async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) }
            const option = { upsert: true };
            const updateDoc = {
                $set: {
                    role: 'isAdmin',
                }
            }
            const result = await userCollection.updateOne(filter, updateDoc, option);
            res.send({ result })
        })

        // check is Admin
        app.get('/user/admin/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email };
            const user = await userCollection.findOne(query);
            res.send({ IsAdmin: user.role == 'isAdmin' });
        })

    } finally {

    }
}
run().catch(console.dir);



app.listen(port, () => {
    console.log(`listening on ${port}`);
})