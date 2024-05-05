const express = require('express')
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser')
require('dotenv').config()
const cors = require('cors')

const app = express()
const port = process.env.SERVER_PORT || 3000;
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');



app.use(cors({
  origin: ["http://localhost:5173"],
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
  credentials: true,
}
))
app.use(express.json());
app.use(cookieParser())




const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.r31xce1.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

// middleware

const verifyToken =(req,res,next)=>{
 const token = req.cookies.token
 
 if(!token){
  return res.status(401).send({message:'Unauthorized Access'})
 }
 jwt.verify(token, process.env.ACCESS_TOKEN, function(err, decoded) {
  if(err){
    return res.status(401).send({message:'Unauthorized Access'})
  }
  req.userInfo=decoded;
  next()
});


}


async function run() {
  try {


    const coffeeCollection = client.db("coffeeDB").collection('coffee');
    const userCollection = client.db("userDB").collection('user');

    // auth relaeted api 

    app.post('/jwt', async (req, res) => {
      const userEmail = req.body;

      const token = jwt.sign(userEmail, process.env.ACCESS_TOKEN, { expiresIn: '1h' });
      res.cookie('token', token, {
        sameSite: 'none',
        httpOnly: true,
        secure: true,
      })

      res.send({ success: true })
    });

    // clear cookes 
    app.post('/jwt/logout', async (req, res) => {
      const userEmail = req.body;
      res.clearCookie('token', {
        maxAge: 0
      })

      res.send({ success: true })
    });




    // services related api 
    // add data

    app.post('/coffee', async (req, res) => {
      const newCoffee = req.body;
      const result = await coffeeCollection.insertOne(newCoffee);
      console.log(newCoffee);

      res.send(result)
    });

    // get data
    app.get('/coffee', async (req, res) => {
      const cursor = coffeeCollection.find();
      const result = await cursor.toArray()
      res.send(result)
    })

    // update data 

    app.get('/coffee/:_id', async (req, res) => {
      const id = req.params._id
      const query = { _id: new ObjectId(id) };
      const result = await coffeeCollection.findOne(query);
      res.send(result)

    })
    app.put('/coffee/:_id', async (req, res) => {
      const id = req.params._id

      const filter = { _id: new ObjectId(id) };
      const updateDoc = req.body;

      const coffee = {
        $set: {
          name: updateDoc.name,
          photo: updateDoc.photo,
          chef: updateDoc.chef,
          supplier: updateDoc.supplier,
          test: updateDoc.test,
          category: updateDoc.category,
          details: updateDoc.details

        },
      };
      const options = { upsert: true };
      const result = await coffeeCollection.updateOne(filter, coffee, options);
      res.send(result)

    })



    // delete data
    app.delete('/coffee/:_id', async (req, res) => {
      const id = req.params._id
      const query = { _id: new ObjectId(id) };
      const result = await coffeeCollection.deleteOne(query);
      if (result.deletedCount === 1) {
        console.log("Successfully deleted one document.");
      } else {
        console.log("No documents matched the query. Deleted 0 documents.");
      }
      res.send(result)
    })

    //  user related api  

    // create user
    app.post('/user', async (req, res) => {
      const newUser = req.body;
      const result = await userCollection.insertOne(newUser);
      res.send(result)
    });

    // get multiple user
    app.get('/user/:email',verifyToken, async (req, res) => {

   const userEmail = req.params.email
   const tokenEmail = req.userInfo?.email
   if(userEmail!==tokenEmail){
    return res.status(403).send({message:'Forbidden Access'})
   }


      const cursor = userCollection.find();
      const result = await cursor.toArray()
      res.send(result)

    })

    // update user 
    app.patch('/user', async (req, res) => {
      const email = req.body.email
      const time = req.body.logTime
      console.log(req.body);

      const filter = { email: email };
      const updateDoc = {
        $set: {
          lastLogTime: time
        },
      };
      const result = await userCollection.updateOne(filter, updateDoc);
      res.send(result)
    })

    // delete a user

    app.delete('/user/:id', async (req, res) => {
      const id = req.params.id;

      const query = { _id: new ObjectId(id) };
      const result = await userCollection.deleteOne(query);
      res.send(result);


    })






    console.log("Pinged your deployment. You successfully connected to MongoDB! m");
  } finally {

    // await client.close();
  }
}

run().catch(console.dir);


app.get('/', (req, res) => {
  res.send('Hello World!moo')
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})