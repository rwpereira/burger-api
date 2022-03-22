const express = require("express");
const cors = require("cors");
const db = require("./config/database");
const res = require("express/lib/response");

const app = express();

const port = process.env.PORT || 3000;

// Middleware JSON
app.use(express.json());

// Middleware CORS
app.use(cors());

/*
    Verbos HTTP:
    --------------------------
    GET -> Retornar dados
    POST -> Cadastrar dados
    PUT -> Editar dados
    PATCH -> Editar dados
    DELETE -> Excluir dados
*/

/*
	Status Code:
    --------------------------
    200 -> Retornar OK
	201 -> Inserido com sucesso
	400 -> Erro (cliente)
	401 -> Não autorizado
	404 -> Não encontrado
	500 -> Erro (servidor)
*/

// Rotas
app.get("/produtos/cardapio", function(request, response){

    let ssql = `select c.descricao as categoria, p.id_produto as idproduto, p.url_foto as urlfoto, p.* 
                  from produto p join produto_categoria c 
                    on (c.id_categoria = p.id_categoria) 
                 order by c.ordem`;

    db.query(ssql, function(err, result){
        if (err){
            return response.status(500).send(err);
        } else {
            return response.status(200).json(result);
        }
    });    
});

app.post("/pedidos", function(request, response){
    

//    db.beginTransaction(function(err){

        let ssql = `insert into pedido(id_usuario, dt_pedido, vl_subtotal, vl_entrega, vl_total, status) 
                    values(?, current_timestamp(), ?, ?, ?, 'A')`;

        db.query(ssql, [request.body.id_usuario, request.body.vl_subtotal,
                        request.body.vl_entrega, request.body.vl_total], function(err, result){
            
            if (err) {
                db.rollback();
                response.status(500).json(err);
            } else {
                var id_pedido = result.insertId;

                if (id_pedido > 0) {
                    const itens = request.body.itens; 
                    var values = [];

                    // [ [ 55, 1, 2, 33.8, 67.6 ], [ 55, 11, 3, 6, 18 ] ]
                    for (var i=0; i < itens.length; i++){
                        values.push([id_pedido, itens[i].id_produto, itens[i].qtd, itens[i].vl_unitario, itens[i].vl_total]);
                    }

                    ssql = "insert into pedido_item(id_pedido, id_produto, qtd, vl_unitario, vl_total) ";
                    ssql += "values ?";

                    db.query(ssql, [values], function(err, result){
                        if (err){
//                            db.rollback();
                            response.status(500).json(err);
                        } else {
//                            db.commit();
                            response.status(201).json({id_pedido: id_pedido});
                        }
                    });
                }
            }
        });  
//    });         
});

app.get("/pedidos", function(request, response){


    let ssql = `select p.id_pedido as idpedido, p.status, date_format(p.dt_pedido, '%d/%m/%Y %H:%i:%s') as dtpedido, p.vl_total as vltotal , count(*) as qtditem 
                 from pedido p join pedido_item i 
                   on (i.id_pedido = p.id_pedido) 
                group by p.id_pedido, p.status, p.dt_pedido, p.vl_total`;

    db.query(ssql, function(err, result){
        if (err){
            return response.status(500).send(err);
        } else {
            return response.status(200).json(result);
        }
    });   

});

app.get("/pedidos/itens", function(request, response){

    let ssql = `select p.id_pedido, date_format(p.dt_pedido, '%d/%m/%Y %H:%i:%s') as dt_pedido, p.status, 
                       u.nome as nome_usuario, u.endereco, i.id_item, o.nome, o.url_foto, i.qtd
                  from pedido p join usuario u 
                    on (u.id_usuario = p.id_usuario) 
                  join pedido_item i 
                    on (i.id_pedido = p.id_pedido) 
                  join produto o 
                    on (o.id_produto = i.id_produto) 
                 where p.status <> 'F'
                 order by p.dt_pedido `;

    db.query(ssql, function(err, result){
        if (err){
            return response.status(500).send(err);
        } else {

           let id_pedidos = [];  // [1000, 1001, 1002, 1010]
           let pedidos = []; // [ {id_pedido: 1000, itens...}, {id_pedido: 1001, itens...}]
           let itens = [];

           // Monta um array com os pedidos uma uica vez...
           result.map((ped) => {
               if (id_pedidos.indexOf(ped.id_pedido) < 0) {
                   id_pedidos.push(ped.id_pedido);

                   pedidos.push({
                       id_pedido: ped.id_pedido,
                       dt_pedido: ped.dt_pedido,
                       status: ped.status,
                       nome: ped.nome_usuario,
                       endereco: ped.endereco,
                       itens: []
                   });
               }
           });

           // Percorre o array acima inserindo os itens nele...
           pedidos.map((ped) => {
               itens = [];

               result.map((pedResult) => {
                   if (pedResult.id_pedido == ped.id_pedido) {
                    itens.push({
                        id_item: pedResult.id_item,
                        nome: pedResult.nome,
                        url_foto: pedResult.url_foto,
                        qtd: pedResult.qtd 
                    });
                   }
               });

               ped.itens = itens;
           });

            return response.status(200).json(pedidos);
        }
    });   
    
});

app.put("/pedidos/status/:id_pedido", function(request, response){
    
    // http://localhost:3000/pedidos/status/1000

    let ssql = "update pedido set status = ? where id_pedido = ? ";

    db.query(ssql, [request.body.status, request.params.id_pedido], function(err, result){
        if (err){
            return response.status(500).send(err);
        } else {
            return response.status(200).json({id_pedido: request.params.id_pedido});
        }
    });   

});

app.get("/configs", function(request, response){
    
    let ssql = "select vl_entrega as vlentrega from config ";

    db.query(ssql, function(err, result){
        if (err){
            return response.status(500).send(err);
        } else {
            return response.status(200).json(result[0]);
        }
    });   

});


app.listen(port, function() {
    console.log("Servidor executando na porta " + port);
});
