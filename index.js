const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql2');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static('public'));
app.set('view engine', 'ejs');

// Chave secreta para JWT (em produção, armazene isso em variáveis de ambiente)
const jwtSecret = 'your_jwt_secret';

// Conectar ao MySQL
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'root',
  database: 'todolistDB'
});

db.connect(err => {
  if (err) throw err;
  console.log('Connected to MySQL');
});

// Função para obter tarefas por status
function getTasksByStatus(status, callback) {
  const query = 'SELECT * FROM tasks WHERE status = ?';
  db.query(query, [status], callback);
}


// Rota principal - visualizar tarefas
app.get('/', (req, res) => {
  const statuses = ['Backlog', 'Fazer', 'Fazendo', 'Feito'];
  let tasks = {};
  
  let count = 0;

  statuses.forEach(status => {
    getTasksByStatus(status, (err, results) => {
      if (err) throw err;
      tasks[status] = results;
      count++;

      if (count === statuses.length) {
        res.render('list', { tasks });
      }
    });
  });
});



// Registro de usuário
app.post('/register', (req, res) => {
  const { username, password } = req.body;
  const hashedPassword = bcrypt.hashSync(password, 8);

  const query = 'INSERT INTO users (username, password) VALUES (?, ?)';
  db.query(query, [username, hashedPassword], (err, results) => {
    if (err) throw err;
    res.send('User registered successfully');
  });
});

// Login de usuário
app.post('/login', (req, res) => {
  const { username, password } = req.body;

  const query = 'SELECT * FROM users WHERE username = ?';
  db.query(query, [username], (err, results) => {
    if (err) throw err;
    if (results.length === 0) {
      return res.status(401).send('User not found');
    }

    const user = results[0];
    const passwordIsValid = bcrypt.compareSync(password, user.password);
    if (!passwordIsValid) {
      return res.status(401).send('Invalid Password');
    }

    const token = jwt.sign({ id: user.id }, jwtSecret, { expiresIn: 86400 }); // Token expira em 5 minutos (300 segundos}); 
    res.json({ auth: true, token });
  });
});

// Middleware para verificar JWT
function verifyJWT(req, res, next) {
  const token = req.headers['x-access-token'];
  console.log('Token recebido:', token);
  if (!token) return res.status(401).send('No token provided.');
  jwt.verify(token, jwtSecret, (err, decoded) => {
    if (err) return res.status(500).send('Failed to authenticate token.');
    
    req.userId = decoded.id;
    next();
  });
}


// adiciona tarefa (rota autenticada)
app.post('/add', verifyJWT, (req, res) => {
  const task = req.body.task;
  console.log('Adding task:', task); // Adicione esta linha para depuração
  const query = 'INSERT INTO tasks (name, status) VALUES (?, ?)';
  db.query(query, [task, 'Backlog'], (err, results) => {
    if (err) {
      console.error('Error adding task:', err); // Adicione esta linha para depuração
      throw err;
    }
    res.send('taks added');
  });
});

// Atualizar status da tarefa (rota autenticada)
app.post('/update-status', verifyJWT, (req, res) => {
  const taskId = req.body.id;
  const status = req.body.status;
  const query = 'UPDATE tasks SET status = ? WHERE id = ?';
  db.query(query, [status, taskId], (err, results) => {
    if (err) throw err;
    res.send('status atualizado');
  });
});

// Atualizar nome da tarefa (rota autenticada)
app.post('/update-name', verifyJWT, (req, res) => {
  const taskId = req.body.id;
  const taskName = req.body.name;
  const query = 'UPDATE tasks SET name = ? WHERE id = ?';
  db.query(query, [taskName, taskId], (err, results) => {
    if (err) throw err;
    res.send('Nome atualizado');
  });
});

// Deletar tarefa (rota autenticada)
app.post('/delete', verifyJWT, (req, res) => {
  const taskId = req.body.id;
  const query = 'DELETE FROM tasks WHERE id = ?';
  db.query(query, [taskId], (err, results) => {
    if (err) throw err;
    res.send('Task deleated');
  });
});
// Lista todas as tarefas
app.get('/getallTasks', verifyJWT, (req, res) => {
  const query = 'SELECT * FROM tasks';
  db.query(query, (err, results) => { 
    if (err) throw err;
    res.send(results);
  });
  });

  //Lista tarefas por status
  app.get('/getTasksByStatus/:status', verifyJWT, (req, res) => {
    const status = req.params.status;
    console.log('Status:', status);
    const query = 'SELECT * FROM tasks WHERE status = ?';
    db.query(query, [status], (err, results) => {
      if (err) throw err;
      res.send(results);
    });
  });

// Iniciar o servidor
app.listen(3000, () => {
  console.log('Server started on port 3000, http://localhost:3000');
});
