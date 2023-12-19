const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Fume API',
      version: '1.0.0',
      description: 'An explanation about fume\'s api - how to use it!',
    },
  },
  apis: ['./routes/*.js'], // Path to the API docs
};

const specs = swaggerJsdoc(options);

const swaggerApi = (app) => {
  app.use('/docs', swaggerUi.serve, swaggerUi.setup(specs));
  app.get('docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(specs);
  })
  console.log(`FUME api docs are available on "/docs".`);
};

export default swaggerApi;