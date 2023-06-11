const express = require('express')
const cors = require('cors')
const jwt = require('jsonwebtoken');
const app = express()
require('dotenv').config()
const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());

const verifyJWT = (req, res, next) => {
    const authorization = req.headers.authorization;
    if (!authorization) {
        return res.status(401).send({ error: true, message: 'unauthorized access' });
    }
    // bearer token
    const token = authorization.split(' ')[1];

    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
            return res.status(401).send({ error: true, message: 'unauthorized access' })
        }
        req.decoded = decoded;
        next();
    })
}


const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
// const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.zael0vm.mongodb.net/?retryWrites=true&w=majority`;

const uri = 'mongodb://0.0.0.0:27017/'

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();

        const instructorsCollection = client.db("language-school").collection("instructors");
        const classesCollection = client.db("language-school").collection("classes");
        const cartCollection = client.db("language-school").collection("carts");
        const studentsCollection = client.db("language-school").collection("students");

        app.post('/jwt', (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' })

            res.send({ token })
        })

        const verifyAdmin = async (req, res, next) => {
            const email = req.decoded.email;
            const query = { email: email }
            const user = await studentsCollection.findOne(query);
            if (user?.role !== 'admin') {
              return res.status(403).send({ error: true, message: 'forbidden message' });
            }
            next();
          }
        const verifyInstructor = async (req, res, next) => {
            const email = req.decoded.email;
            const query = { email: email }
            const user = await studentsCollection.findOne(query);
            if (user?.role !== 'instructor') {
              return res.status(403).send({ error: true, message: 'forbidden message' });
            }
            next();
          }

        // students related apis
        app.get('/students', verifyJWT, verifyAdmin, async (req, res) => {
            const result = await studentsCollection.find().toArray();
            res.send(result);
        });

        app.post('/students', async (req, res) => {
            const student = req.body;
            const query = { email: student.email }
            const existingUser = await studentsCollection.findOne(query);

            if (existingUser) {
                return res.send({ message: 'student already exists' })
            }
            const result = await studentsCollection.insertOne(student);
            res.send(result);
        });

        app.patch('/students/admin/:id', async (req, res) => {
            const id = req.params.id;
            console.log(id);
            const filter = { _id: new ObjectId(id) };
            const updateDoc = {
                $set: {
                    role: 'admin'
                },
            };

            const result = await studentsCollection.updateOne(filter, updateDoc);
            res.send(result);

        });

        app.get('/students/admin/:email', verifyJWT, async (req, res) => {
            const email = req.params.email;
      
            if (req.decoded.email !== email) {
              res.send({ admin: false })
            }
      
            const query = { email: email }
            const user = await studentsCollection.findOne(query);
            const result = { admin: user?.role === 'admin' }
            res.send(result);
          })

        app.get('/students/instructor/:email', verifyJWT, async (req, res) => {
            const email = req.params.email;
      
            if (req.decoded.email !== email) {
              res.send({ instructor: false })
            }
      
            const query = { email: email }
            const user = await studentsCollection.findOne(query);
            const result = { instructor: user?.role === 'instructor' }
            res.send(result);
          })

        app.patch('/students/instructor/:id', async (req, res) => {
            const id = req.params.id;
            console.log(id);
            const filter = { _id: new ObjectId(id) };
            const updateDoc = {
                $set: {
                    role: 'instructor'
                },
            };

            const result = await studentsCollection.updateOne(filter, updateDoc);
            res.send(result);

        });

        app.delete('/students/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await studentsCollection.deleteOne(query);
            res.send(result);
        })

        // get instructors data
        app.get('/instructors', async (req, res) => {
            const result = await instructorsCollection.find().toArray();
            res.send(result);
        })

        // get classes data
        app.get('/classes', async (req, res) => {
            const result = await classesCollection.find().toArray();
            res.send(result);
        })

        // cart data
        app.get('/carts', verifyJWT, async (req, res) => {
            const email = req.query.email;

            if (!email) {
                res.send([]);
            }

            const decodedEmail = req.decoded.email;
            if (email !== decodedEmail) {
              return res.status(403).send({ error: true, message: 'forbidden access' })
            }

            const query = { email: email };
            const result = await cartCollection.find(query).toArray();
            res.send(result);
        });

        app.post('/carts', async (req, res) => {
            const item = req.body;
            const result = await cartCollection.insertOne(item);
            res.send(result);
        });

        app.delete('/carts/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await cartCollection.deleteOne(query);
            res.send(result);
        })



        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);


app.get('/', (req, res) => {
    res.send('language school is running...')
})

app.listen(port, () => {
    console.log(`language school is running on port ${port}`)
})