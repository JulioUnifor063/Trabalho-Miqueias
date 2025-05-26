
const http = require('http');
const https = require('https');



const URL_BASE_API = 'https://swapi.dev/api/';
const PORTA_HTTP = process.env.PORT || 3000;


const TIMEOUT_REQUISICAO_MS = 5000;
const LIMITE_POPULACAO_PLANETA_GRANDE = 1000000000;
const LIMITE_DIAMETRO_PLANETA_GRANDE = 10000;
const QTD_NAVES_EXIBIR = 3;
const ID_MAX_VEICULO_BUSCAR = 4;


const ConfiguracaoApp = {
    modoDebug: true,
    timeoutRequisicao: TIMEOUT_REQUISICAO_MS,
};


const EstadoApp = {
    cache: {},
    contagemErros: 0,
    contagemBuscas: 0,
    tamanhoTotalDados: 0,
    ultimoIdPessoa: 1,
};



/**
 
 * @param {...any} mensagens 
 */
function registrarDebug(...mensagens) {
    if (ConfiguracaoApp.modoDebug) {
        console.log(...mensagens);
    }
}

/**
 
 * @param {Error} erro 
 * @param {string} contexto 
 */
function tratarErro(erro, contexto) {
    console.error(`Erro em ${contexto}:`, erro.message);
    EstadoApp.contagemErros++;
}


/**

 * @param {string} caminhoRecurso 
 * @returns {Promise<object>} 
 */
async function buscarDadosSwapi(caminhoRecurso) {
    if (EstadoApp.cache[caminhoRecurso]) {
        registrarDebug("Usando dados do cache para", caminhoRecurso);
        return EstadoApp.cache[caminhoRecurso];
    }

    registrarDebug("Buscando dados novos para", caminhoRecurso);

    return new Promise((resolver, rejeitar) => {
        let bufferDados = '';
        const url = `${URL_BASE_API}${caminhoRecurso}`;

        const requisicao = https.get(url, { rejectUnauthorized: false }, (resposta) => {
            if (resposta.statusCode >= 400) {
                return rejeitar(new Error(`Requisição falhou com status ${resposta.statusCode}`));
            }

            resposta.on('data', (chunk) => { bufferDados += chunk; });
            resposta.on('end', () => {
                try {
                    const dadosParseados = JSON.parse(bufferDados);
                    EstadoApp.cache[caminhoRecurso] = dadosParseados;
                    EstadoApp.tamanhoTotalDados += bufferDados.length;
                    registrarDebug(`Dados buscados com sucesso para ${caminhoRecurso}`);
                    registrarDebug(`Tamanho do cache: ${Object.keys(EstadoApp.cache).length}`);
                    resolver(dadosParseados);
                } catch (erroParse) {
                    rejeitar(erroParse);
                }
            });
        }).on('error', (erroRequisicao) => {
            rejeitar(erroRequisicao);
        });

        requisicao.setTimeout(ConfiguracaoApp.timeoutRequisicao, () => {
            requisicao.abort();
            rejeitar(new Error(`Timeout na requisição para ${caminhoRecurso}`));
        });
    }).catch(erro => {
        tratarErro(erro, `buscarDadosSwapi(${caminhoRecurso})`);
        throw erro; 
    });
}

/**
 
 * @param {object} personagem
 */
function exibirDetalhesPersonagem(personagem) {
    console.log('\n--- Personagem ---');
    console.log('Nome:', personagem.name);
    console.log('Altura:', personagem.height);
    console.log('Massa:', personagem.mass);
    console.log('Aniversário:', personagem.birth_year);
    if (personagem.films?.length > 0) {
        console.log('Aparece em', personagem.films.length, 'filmes');
    }
}

/**
 
 * @param {object} nave 
 * @param {number} indice 
 */
function exibirDetalhesNave(nave, indice) {
    console.log(`\n--- Nave Estelar ${indice + 1} ---`);
    console.log('Nome:', nave.name);
    console.log('Modelo:', nave.model);
    console.log('Fabricante:', nave.manufacturer);
    console.log('Custo:', nave.cost_in_credits !== 'unknown' ? `${nave.cost_in_credits} créditos` : 'desconhecido');
    console.log('Velocidade:', nave.max_atmosphering_speed);
    console.log('Classificação Hyperdrive:', nave.hyperdrive_rating);
    if (nave.pilots?.length > 0) {
        console.log('Pilotos:', nave.pilots.length);
    }
}

/**
 
 * @param {object} planeta
 */
function exibirDetalhesPlaneta(planeta) {
     console.log(
        `- ${planeta.name}: Pop: ${planeta.population}, Diâmetro: ${planeta.diameter}, Clima: ${planeta.climate}`
    );
    if (planeta.films?.length > 0) {
        console.log(`  Aparece em ${planeta.films.length} filmes`);
    }
}

/**
 
 * @param {object} filme
 * @param {number} indice 
 */
function exibirDetalhesFilme(filme, indice) {
    console.log(`\n${indice + 1}. ${filme.title} (${filme.release_date})`);
    console.log(`   Diretor: ${filme.director}`);
    console.log(`   Produtor: ${filme.producer}`);
    console.log(`   Personagens: ${filme.characters.length}`);
    console.log(`   Planetas: ${filme.planets.length}`);
}

/**
  @param {object} veiculo 
 */
function exibirDetalhesVeiculo(veiculo) {
    console.log('\n--- Veículo em Destaque ---');
    console.log('Nome:', veiculo.name);
    console.log('Modelo:', veiculo.model);
    console.log('Fabricante:', veiculo.manufacturer);
    console.log('Custo:', veiculo.cost_in_credits, 'créditos');
    console.log('Comprimento:', veiculo.length);
    console.log('Tripulação Necessária:', veiculo.crew);
    console.log('Passageiros:', veiculo.passengers);
}


function exibirEstatisticas() {
    registrarDebug('\n--- Estatísticas ---');
    registrarDebug('Chamadas à API:', EstadoApp.contagemBuscas);
    registrarDebug('Tamanho do Cache:', Object.keys(EstadoApp.cache).length);
    registrarDebug('Tamanho Total dos Dados:', EstadoApp.tamanhoTotalDados, 'bytes');
    registrarDebug('Contagem de Erros:', EstadoApp.contagemErros);
}



async function processarPersonagem() {
    const personagem = await buscarDadosSwapi(`people/${EstadoApp.ultimoIdPessoa}`);
    exibirDetalhesPersonagem(personagem);
}

async function processarNaves() {
    const dadosNaves = await buscarDadosSwapi('starships/?page=1');
    console.log('\n--- Naves Estelares ---');
    console.log('Total:', dadosNaves.count);

    dadosNaves.results
        .slice(0, QTD_NAVES_EXIBIR)
        .forEach(exibirDetalhesNave);
}

async function processarPlanetas() {
    const dadosPlanetas = await buscarDadosSwapi('planets/?page=1');
    console.log('\n--- Planetas Grandes e Populosos ---');

    dadosPlanetas.results
        .filter(planeta =>
            planeta.population !== 'unknown' &&
            parseInt(planeta.population) > LIMITE_POPULACAO_PLANETA_GRANDE &&
            planeta.diameter !== 'unknown' &&
            parseInt(planeta.diameter) > LIMITE_DIAMETRO_PLANETA_GRANDE
        )
        .forEach(exibirDetalhesPlaneta);
}

async function processarFilmes() {
    const dadosFilmes = await buscarDadosSwapi('films/');
    console.log('\n--- Filmes Star Wars (Ordem Cronológica) ---');

    dadosFilmes.results
        .sort((a, b) => new Date(a.release_date) - new Date(b.release_date))
        .forEach(exibirDetalhesFilme);
}

async function processarVeiculo() {
    if (EstadoApp.ultimoIdPessoa >= ID_MAX_VEICULO_BUSCAR) {
        const veiculo = await buscarDadosSwapi(`vehicles/${EstadoApp.ultimoIdPessoa}`);
        exibirDetalhesVeiculo(veiculo);
    }
}


async function executarApresentacaoSwapi() {
    try {
        registrarDebug("Iniciando busca de dados...");
        EstadoApp.contagemBuscas++;

        await processarPersonagem();
        await processarNaves();
        await processarPlanetas();
        await processarFilmes();
        await processarVeiculo();

        EstadoApp.ultimoIdPessoa++;

        exibirEstatisticas();

    } catch (erro) {
        console.error("Ocorreu um erro durante a execução. Verifique os logs acima.");
    }
}



function processarArgumentos() {
    const args = process.argv.slice(2);
    if (args.includes('--no-debug')) {
        ConfiguracaoApp.modoDebug = false;
    }
    const indiceTimeout = args.indexOf('--timeout');
    if (indiceTimeout !== -1 && indiceTimeout < args.length - 1) {
        const valorTimeout = parseInt(args[indiceTimeout + 1]);
        if (!isNaN(valorTimeout)) {
            ConfiguracaoApp.timeoutRequisicao = valorTimeout;
        }
    }
}



function gerarHtml() {
    return `
        <!DOCTYPE html>
        <html>
            <head>
                <title>Star Wars API Demo</title>
                <meta charset="UTF-8">
                <style>
                    body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
                    h1 { color: #FFE81F; background-color: #000; padding: 10px; text-align: center; border-radius: 5px; }
                    button { background-color: #FFE81F; border: 1px solid #000; padding: 10px 20px; cursor: pointer; font-size: 16px; border-radius: 3px; }
                    button:hover { opacity: 0.8; }
                    .footer { margin-top: 50px; font-size: 12px; color: #666; border-top: 1px solid #ccc; padding-top: 10px; }
                    pre { background: #f4f4f4; padding: 10px; border-radius: 5px; white-space: pre-wrap; word-wrap: break-word; }
                    #results { margin-top: 20px; font-weight: bold; }
                </style>
            </head>
            <body>
                <h1>Star Wars API Demo (Refatorado PT)</h1>
                <p>Clique no botão para buscar dados da API Star Wars através do servidor. Verifique o console do seu servidor para resultados detalhados.</p>
                <button onclick="buscarDadosPelaPagina()">Buscar Dados Star Wars</button>
                <div id="results"></div>
                <script>
                    function buscarDadosPelaPagina() {
                        const divResultados = document.getElementById('results');
                        divResultados.innerHTML = '<p>Carregando dados... Por favor, aguarde.</p>';
                        fetch('/api')
                            .then(res => {
                                if (!res.ok) throw new Error('A resposta da rede não foi OK');
                                return res.text();
                            })
                            .then(text => {
                                divResultados.innerHTML = '<p>Dados buscados! Verifique o console do servidor para detalhes completos.</p>';
                            })
                            .catch(err => {
                                divResultados.innerHTML = '<p>Erro: Não foi possível buscar os dados. ' + err.message + '</p>';
                            });
                    }
                </script>
                <div class="footer">
                    <p>Estatísticas Atuais:</p>
                    <pre>Chamadas API: ${EstadoApp.contagemBuscas} | Entradas Cache: ${Object.keys(EstadoApp.cache).length} | Erros: ${EstadoApp.contagemErros} | Debug: ${ConfiguracaoApp.modoDebug ? 'LIGADO' : 'DESLIGADO'} | Timeout: ${ConfiguracaoApp.timeoutRequisicao}ms</pre>
                </div>
            </body>
        </html>
    `;
}



function criarServidor() {
    return http.createServer(async (requisicao, resposta) => {
        registrarDebug(`Requisição recebida: ${requisicao.method} ${requisicao.url}`);
        try {
            switch (requisicao.url) {
                case '/':
                case '/index.html':
                    resposta.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
                    resposta.end(gerarHtml());
                    break;
                case '/api':
                    await executarApresentacaoSwapi(); // Roda a lógica principal
                    resposta.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
                    resposta.end('Processo da API finalizado. Verifique o console do servidor.');
                    break;
                case '/stats':
                    resposta.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
                    resposta.end(JSON.stringify({ ...EstadoApp, ...ConfiguracaoApp }));
                    break;
                default:
                    resposta.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
                    resposta.end('Não Encontrado');
            }
        } catch (erroServidor) {
            tratarErro(erroServidor, `Requisição Servidor (${requisicao.url})`);
            resposta.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
            resposta.end('Erro Interno do Servidor');
        }
    });
}


function principal() {
    processarArgumentos(); 

    const servidor = criarServidor();

    servidor.listen(PORTA_HTTP, () => {
        console.log(`Servidor rodando em http://localhost:${PORTA_HTTP}/`);
        console.log('Abra a URL no seu navegador e clique no botão.');
        registrarDebug('Modo Debug:', ConfiguracaoApp.modoDebug ? 'LIGADO' : 'DESLIGADO');
        registrarDebug('Timeout:', ConfiguracaoApp.timeoutRequisicao, 'ms');
    });
}

// Inicia a aplicação
principal();