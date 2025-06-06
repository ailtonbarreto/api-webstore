import express from 'express';
import cors from 'cors';
import pkg from 'pg';


const { Pool } = pkg;
const app = express();


// --------------------------------------------------------------------------------------
// CONFIGURAÇÕES
app.use(cors());
app.use(express.json());

// --------------------------------------------------------------------------------------
// CRENDENCIAL
const pool = new Pool({
  user: 'webstore_b2b_owner',
  host: 'ep-long-salad-aczix9aa-pooler.sa-east-1.aws.neon.tech',
  database: 'webstore_b2b',
  password: 'npg_iYEzyaTLg4f8',
  port: 5432,
  ssl: {
    rejectUnauthorized: false,
  },
});


// --------------------------------------------------------------------------------------
// PERMISSOES DO SITE
const corsOptions = {
  origin: "*",
  methods: 'GET,POST',
};

app.use(cors(corsOptions));

// --------------------------------------------------------------------------------------
// CARREGAR TABELA INTEGRACAO

async function tabela_integracao() {
  try {
    const client = await pool.connect();
    const result = await client.query(

      `
    
        with estoque_calculado as (
      select
        e."SKU",
        SUM(case 
              when e."TIPO" = 'E' then e."QTD"
              when e."TIPO" = 'S' then -e."QTD"
              else 0
            end) as "ESTOQUE_TOTAL"
      from
        public.tb_mov_estoque as e
      group by
        e."SKU"
    )
    select
      cp."PARENT",
      cp."DESCRICAO_PARENT" as "DESCRICAO",
      cp."CATEGORIA",
      cp."VR_UNIT" as "PRECO_DE",
    ROUND((cp."VR_UNIT" - (cp."VR_UNIT" * 0.10))::numeric, 2) AS "PRECO_POR",
      p."ATIVO",
      SUM(coalesce(ec."ESTOQUE_TOTAL", 0)) as "ESTOQUE_VENDA",
      cp."HOME",
      cp."IMAGEM"
    from
      public.tb_produto as p
      join public.tb_produto_parent as cp on p."PARENT" = cp."PARENT"
      left join estoque_calculado as ec on p."SKU" = ec."SKU"
    group by
      cp."PARENT",
      cp."DESCRICAO_PARENT",
      cp."CATEGORIA",
      cp."VR_UNIT",
      p."ATIVO",
      cp."HOME",
      cp."IMAGEM";
      
  `)

  
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

app.get('/vendas/:sku_cliente', async (req, res) => {
  const { sku_cliente } = req.params;

  if (!sku_cliente) {
    return res.status(400).json({ error: "SKU do cliente é obrigatório" });
  }

  try {
    const client = await pool.connect();
    const query = `

    SELECT 
      "PEDIDO", 
      "EMISSAO", 
      "ENTREGA", 
      SUM("QTD" * "VR_UNIT") AS "TOTAL_PEDIDO",
      "STATUS"
    FROM public.tb_venda
    WHERE "SKU_CLIENTE" = $1
    GROUP BY "PEDIDO", "EMISSAO", "ENTREGA", "STATUS"
    ORDER BY "EMISSAO";


    `;
    const result = await client.query(query, [sku_cliente]);

    client.release();

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Nenhum pedido encontrado para este cliente" });
    }

    res.json(result.rows);
  } catch (error) {
    console.error("Erro ao buscar pedidos do cliente:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});


// --------------------------------------------------------------------------------------
// CONSULTA POWER BI

async function select_powerbi() {
  try {
    const client = await pool.connect();
    const query = `

    SELECT
      v."PEDIDO",
      v."SKU_CLIENTE",
      v."EMISSAO",
      v."PARENT",
      p."CATEGORIA",
      p."DESCRICAO",
      v."QTD",
      c."CIDADE",
      c."UF",
      v."VR_UNIT",
      v."STATUS",
      c."CLIENTE",
      c."REP"
      FROM public.tb_venda AS v
      LEFT JOIN (
          SELECT DISTINCT ON ("PARENT") 
              "PARENT",
              "DESCRICAO",
              "CATEGORIA"
          FROM public.tb_produto
          ORDER BY "PARENT"
      ) AS p ON v."PARENT" = p."PARENT"
      LEFT JOIN public.tb_cliente AS c ON v."SKU_CLIENTE" = c."SKU_CLIENTE"
      WHERE v."EMISSAO" >= '2024-01-01';

    `;
    const result = await client.query(query);
    const dadosArray = result.rows;
    client.release();
    return dadosArray;
  } catch (error) {
    console.error('Erro ao conectar ou consultar o PostgreSQL:', error);
    throw error;
  }
}

app.get('/powerbi', async (req, res) => {
  try {
    const dadosArray = await select_powerbi();
    res.json(dadosArray);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao obter dados do Power BI.' });
  }
});


// --------------------------------------------------------------------------------------
// CARREGAR CADASTRO DE PRODUTOS

async function tabela_produtos() {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT * FROM public.tb_produto');
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
// CONSULTA DE ESTOQUE

async function Carregar_Estoque() {
  try {
    const client = await pool.connect();
    const result = await client.query(

      `
      
      WITH estoque_calculado AS (
                    SELECT 
                        e."SKU",
                        SUM(CASE 
                                WHEN e."TIPO" = 'E' THEN e."QTD"
                                WHEN e."TIPO" = 'S' THEN -e."QTD"
                                ELSE 0
                            END) AS "ESTOQUE_TOTAL"
                    FROM 
                        public.tb_mov_estoque AS e
                    GROUP BY 
                        e."SKU"
                )
                SELECT 
                    cp."PARENT",
                    p."SKU",
                    cp."IMAGEM",
                    cp."CATEGORIA",
                    cp."VR_UNIT",
                    p."ATIVO",
                    p."VARIACAO",
                    cp."DESCRICAO_PARENT",
                    COALESCE(ec."ESTOQUE_TOTAL", 0) AS "ESTOQUE"
                FROM 
                    public.tb_produto AS p
                JOIN 
                    public.tb_produto_parent AS cp
                ON 
                    p."PARENT" = cp."PARENT"
                LEFT JOIN 
                    estoque_calculado AS ec
                ON 
                    p."SKU" = ec."SKU"
                    `
    );
    const dadosArray = result.rows;
    client.release();
    return dadosArray;
  } catch (error) {
    console.error('Erro ao conectar ou consultar o PostgreSQL:', error);
    return [];
  }
}

app.get('/estoque', async (req, res) => {
  const dadosArray = await Carregar_Estoque();
  res.json(dadosArray);
});




// --------------------------------------------------------------------------------------
// CARREGAR TABELA DE CLIENTES

async function tabela_clientes() {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT * FROM public.tb_cliente');
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
// INSERIR NEWSLETTER

app.post('/newsletter', async (req, res) => {
  const { nome, fone, email } = req.body;

  const insertQuery = `
    INSERT INTO public.tb_newsletter ("NOME", "FONE", "EMAIL")
    VALUES ($1, $2, $3)
    RETURNING *;
  `;

  try {
    const result = await pool.query(insertQuery, [nome, fone, email]);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("Erro ao inserir dados na tabela newsletter:", error);
    res.status(500).json({ error: "Erro ao inserir dados na tabela newsletter." });
  }
});

// --------------------------------------------------------------------------------------
// INSERIR PEDIDO

async function getMaxSequencia() {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT MAX("SEQUENCIA") AS maior_valor FROM public.tb_venda');
    const max_value = result.rows[0].maior_valor || 50000;
    client.release();
    return max_value;
  } catch (error) {
    console.error('Erro ao pegar o maior valor de SEQUENCIA:', error);
    return null;
  }
}

app.post('/inserir', async (req, res) => {
  console.log('Corpo da requisição:', req.body);

  if (!Array.isArray(req.body) || req.body.length === 0) {
    return res.status(400).json({ message: 'Nenhum dado para inserir' });
  }

  const query = `
    INSERT INTO public.tb_venda ("PEDIDO", "EMISSAO", "ENTREGA", "SKU_CLIENTE", "SKU", "PARENT", "QTD", "VR_UNIT", "SEQUENCIA", "STATUS")
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    RETURNING *;
  `;

  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    const maxSequencia = await getMaxSequencia();
    if (maxSequencia === null) {
      throw new Error('Não foi possível obter o valor de SEQUENCIA');
    }

    const novaSequencia = maxSequencia + 1;
    const resultados = [];

    for (const dados of req.body) {
      const { pedido, emissao, entrega, sku_cliente, parent, produto, quantidade, valor_unit, situacao } = dados;

      const valores = [
        `PED${novaSequencia}`, emissao, entrega, sku_cliente, produto, parent, quantidade, valor_unit, novaSequencia, situacao
      ];

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

// --------------------------------------------------------------------------------------
// INSERIR CLIENTE

app.post('/inserir_cliente', async (req, res) => {
  console.log('Corpo da requisição:', req.body);

  try {
    const { razao_social, cidade, uf, user, senha } = req.body;

    // A inserção agora não passa mais o SKU_CLIENTE, pois ele será gerado automaticamente pela sequência.
    const query = `
      INSERT INTO public.tb_cliente ("CLIENTE", "CIDADE", "UF", "USER", "PASSWORD", "STATUS")
      VALUES ($1, $2, $3, $4, $5, 0)
      RETURNING *;
    `;

    const valores = [razao_social, cidade, uf, user, senha];

    const client = await pool.connect();
    const resultado = await client.query(query, valores);
    client.release();

    res.status(201).json({ message: 'Cliente cadastrado com sucesso!', data: resultado.rows[0] });
  } catch (error) {
    console.error('Erro ao inserir cliente:', error);
    res.status(500).json({ message: 'Erro ao cadastrar cliente', error: error.message });
  }
});


// --------------------------------------------------------------------------------------
// CAPTURAR DETALHES DO PEDIDO

app.get('/pedido/:pedidoId', async (req, res) => {
  const { pedidoId } = req.params;
  try {
    const query = `
    SELECT  
        v."PEDIDO",
        v."EMISSAO",
        p."DESCRICAO",
        v."QTD",
        v."VR_UNIT",
        v."STATUS"
    FROM 
        public.tb_venda AS v
    LEFT JOIN (
        SELECT DISTINCT ON ("PARENT") "PARENT", "DESCRICAO"
        FROM public.tb_produto
        ORDER BY "PARENT"
    ) AS p ON v."PARENT" = p."PARENT"
    WHERE v."PEDIDO" = $1;
    `;
    const result = await pool.query(query, [pedidoId]);

    console.log(result);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Pedido não encontrado" });
    }

    res.json(result.rows);
  } catch (error) {
    console.error("Erro ao buscar o pedido:", error);
    res.status(500).json({ error: "Erro no servidor" });
  }
});

// --------------------------------------------------------------------------------------
// CAPTURAR DETALHES DO PEDIDO POR REPRESENTANTE

app.get('/array/:name', async (req, res) => {
  const { name } = req.params;

  try {
    const query = `
      SELECT
        v."PEDIDO",
        v."SKU_CLIENTE",
        v."EMISSAO",
        v."ENTREGA",
        TO_CHAR(v."EMISSAO", 'DD') AS DIA,
        TO_CHAR(v."EMISSAO", 'MM') AS MES,
        TO_CHAR(v."EMISSAO", 'YYYY') AS ANO,
        v."PARENT",
        p."CATEGORIA",
        p."DESCRICAO",
        v."QTD",
        v."VR_UNIT",
        v."STATUS",
        c."CLIENTE",
        c."REP"
      FROM public.tb_venda AS v
      LEFT JOIN (
          SELECT DISTINCT ON ("PARENT") 
              "PARENT",
              "DESCRICAO",
              "CATEGORIA"
          FROM public.tb_produto
          ORDER BY "PARENT"
      ) AS p ON v."PARENT" = p."PARENT"
      LEFT JOIN public.tb_cliente AS c ON v."SKU_CLIENTE" = c."SKU_CLIENTE"
      WHERE v."EMISSAO" >= '2024-01-01'
      and c."REP" = $1;
	
    `;

    const result = await pool.query(query, [name]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Nenhum pedido encontrado para esse representante" });
    }

    res.json(result.rows);
  } catch (error) {
    console.error("Erro ao buscar os pedidos:", error);
    res.status(500).json({ error: "Erro no servidor" });
  }
});


// ----------------------------------------------------------------------------------------
// RODANDO NO SERVIDOR - node database.js

const porta = 3000

app.listen(porta, () => {
  console.log(`Servidor rodando em http://localhost:${porta}`);
});
