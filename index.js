const path = require('path');
const express = require('express');
const bodyParser = require('body-parser');

const app = express();

const flowRoutes = require('./routes/flowscribe');
console.log('flowRoutes type:', typeof flowRoutes); // 디버깅용

app.set('view engine', 'ejs');
app.set('views', 'views');

app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/flowscribe', flowRoutes);

app.listen(3000, () => console.log('Server started on port 3000'));
