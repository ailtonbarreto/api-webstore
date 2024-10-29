import express from 'express';
import cors from 'cors';
import pkg from 'pg';
const { Pool } = pkg;
const app = express();


// --------------------------------------------------------------------------------------
// AUX
app.use(cors());

// --------------------------------------------------------------------------------------
// CRENDENCIAL
const pool = new Pool({
  user: 'postgres',
  host: 'gluttonously-bountiful-sloth.data-1.use1.tembo.io',
  database: 'postgres',
  password: 'MeSaIkkB57YSOgLO',
  port: 5432,
  ssl: {
    rejectUnauthorized: false,
  },
});

// --------------------------------------------------------------------------------------
// CARREGAR INTEGRACAO

async function tabela_integracao() {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT * FROM tembo.tb_integracao');
    const dadosArray = result.rows;
    client.release();
    return dadosArray;
  } catch (error) {
    console.error('Erro ao conectar ou consultar o PostgreSQL:', error);
    return [];
  }
}

app.get('/integracao', async (req, res) => {
  const dadosArray = await tabela_integracao();
  res.json(dadosArray);
});

// --------------------------------------------------------------------------------------
// TABELA DE VENDAS

async function listar_vendas() {
  try {
    const client = await pool.connect();
    const result = await client.query(`select * from tembo.tb_venda where "EMISSAO" >= '2024-06-20'`);
    const dadosArray = result.rows;
    client.release();
    return dadosArray;
  } catch (error) {
    console.error('Erro ao conectar ou consultar o PostgreSQL:', error);
    return [];
  }
}

app.get('/vendas', async (req, res) => {
  const dadosArray = await listar_vendas();
  res.json(dadosArray);
});

// --------------------------------------------------------------------------------------
// CARREGAR CADASTRO DE PRODUTOS

async function tabela_produtos() {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT * FROM tembo.tb_produto');
    const dadosArray = result.rows;
    client.release();
    return dadosArray;
  } catch (error) {
    console.error('Erro ao conectar ou consultar o PostgreSQL:', error);
    return [];
  }
}

app.get('/produtos', async (req, res) => {
  const dadosArray = await tabela_produtos();
  res.json(dadosArray);
});

// --------------------------------------------------------------------------------------
// CARREGAR TABELA DE CLIENTES

async function tabela_clientes() {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT * FROM tembo.tb_cliente');
    const dadosArray = result.rows;
    client.release();
    return dadosArray;
  } catch (error) {
    console.error('Erro ao conectar ou consultar o PostgreSQL:', error);
    return [];
  }
}

app.get('/clientes', async (req, res) => {
  const dadosArray = await tabela_clientes();
  res.json(dadosArray);
});


// ----------------------------------------------------------------------------------------
app.listen(3000, () => {
  console.log('Servidor rodando em http://localhost:3000');
});
