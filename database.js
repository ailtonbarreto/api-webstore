import express from 'express';
import cors from 'cors';
import pkg from 'pg';
const { Pool } = pkg;
const app = express();


// --------------------------------------------------------------------------------------
// --------------------------------------------------------------------------------------
// CONFIGURAÇÕES
app.use(cors());
app.use(express.json()); // Para interpretar JSON no body das requisições

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
    const result = await client.query('select * from tembo.tb_venda');

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
// ULTIMO PEDIDO
async function getMaxSequencia() {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT MAX("SEQUENCIA") AS maior_valor FROM tembo.tb_venda');
    const max_value = result.rows[0].maior_valor;  // O maior valor de SEQUENCIA
    client.release();
    return max_value;
  } catch (error) {
    console.error('Erro ao pegar o maior valor de SEQUENCIA:', error);
    return null;
  }
}

app.get('/lastorder', async (req, res) => {
  const lastorder = await getMaxSequencia();
  console.log(lastorder);
  res.json({ maior_valor: lastorder + 1 });
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


// --------------------------------------------------------------------------------------
// INSERIR PEDIDO
app.use(cors({ origin: 'https://ailtonbarreto.github.io/webstore/pedido.html' }));


app.post('/inserir', async (req, res) => {
  console.log('Corpo da requisição:', req.body);

  // Verifique se há dados a serem inseridos
  if (!Array.isArray(req.body) || req.body.length === 0) {
    return res.status(400).json({ message: 'Nenhum dado para inserir' });
  }

  const query = `
    INSERT INTO tembo.tb_venda ("EMISSAO", "ENTREGA", "SKU_CLIENTE", "SKU", "PARENT", "QTD", "VR_UNIT", "STATUS")
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING *;
  `;

  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    const resultados = [];

    // Itera sobre cada item do array
    for (const dados of req.body) {
      const { emissao, entrega, sku_cliente, produto, parent, quantidade, valor_unit, situacao } = dados;

      const valores = [emissao, entrega, sku_cliente, produto, parent, quantidade, valor_unit, situacao];
      const resultado = await client.query(query, valores);

      resultados.push(resultado.rows[0]);
    }

    await client.query('COMMIT');
    res.status(201).json({ message: 'Inserções bem-sucedidas', data: resultados });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Erro ao inserir dados:', error);
    res.status(500).json({ message: 'Erro ao inserir dados', error: error.message });
  } finally {
    client.release();
  }
});




// ----------------------------------------------------------------------------------------
// RODANDO NO SERVIDOR - node database.js
app.listen(3000, () => {
  console.log('Servidor rodando em http://localhost:3000');
});
