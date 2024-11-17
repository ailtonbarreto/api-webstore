SELECT
    v."PEDIDO",
    v."SKU_CLIENTE",
    v."EMISSAO",
    v."PARENT",
    p."DESCRICAO_PARENT",
    p."CATEGORIA",
    p."DESCRICAO",
    v."QTD",
    v."VR_UNIT",
    v."STATUS",
    c."CLIENTE",
    c."UF"
FROM tembo.tb_venda AS v
LEFT JOIN (
    SELECT DISTINCT ON ("PARENT") 
        "PARENT", 
        "DESCRICAO_PARENT", 
        "CATEGORIA", 
        "DESCRICAO"
    FROM tembo.tb_produto 
    ORDER BY "PARENT"
) AS p ON v."PARENT" = p."PARENT"
LEFT JOIN tembo.tb_cliente AS c ON v."SKU_CLIENTE" = c."SKU_CLIENTE";
