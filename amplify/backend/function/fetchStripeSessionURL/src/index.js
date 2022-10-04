const AWS = require('aws-sdk')
const validateCartItems =
    require('use-shopping-cart/utilities').validateCartItems

const Stripe = require('stripe')

exports.handler = async (event) => {
    const { Parameters } = await new AWS.SSM()
        .getParameters({
            Names: ['STRIPE_SECRET_KEY'].map((secretName) => process.env[secretName]),
            WithDecryption: true,
        })
        .promise()

    const stripe = Stripe(Parameters[0].Value)
    const docClient = new AWS.DynamoDB.DocumentClient()
    const cartItems = event.arguments.input

    let fetchedProductData = await docClient
        .scan({
            TableName: process.env.API_STRIPEWALKTHROUGH_PRODUCTTABLE_NAME,
        })
        .promise()

    try {
        let line_items = validateCartItems(fetchedProductData.Items, cartItems)

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            billing_address_collection: 'auto',
            mode: 'payment',
            success_url: 'http://localhost:3000/success',
            cancel_url: 'http://localhost:3000/cancel',
            line_items: line_items,
        })
        return JSON.stringify({ sessionId: session.url })
    } catch (e) {
        console.log('uh oh..', e)
        return 'error, check function logs'
    }
}
