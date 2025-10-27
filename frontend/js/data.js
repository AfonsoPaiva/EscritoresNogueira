// ==================================
// DATA.JS - Mock data for the website
// ==================================

// Books Database
const booksData = [
    {
        id: 1,
        title: "O Retrato de Dorian Gray",
        author: "Oscar Wilde",
        category: "ficcao",
        price: 15.90,
        oldPrice: null,
        description: "Uma obra-prima da literatura que explora a vaidade, a moralidade e a dualidade da natureza humana. Dorian Gray, um jovem de extraordinária beleza, vende sua alma para manter sua juventude enquanto um retrato envelhece em seu lugar.",
        isbn: "978-0-14-143957-0",
        pages: 254,
        year: 1890,
        language: "Português",
        publisher: "Penguin Classics",
        featured: true,
        promo: false,
        image: null,
        samplePages: [
            "https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=600&h=800&fit=crop",
            "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=600&h=800&fit=crop",
            "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&h=800&fit=crop",
            "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600&h=800&fit=crop",
            "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=600&h=800&fit=crop"
        ]
    },
    {
        id: 2,
        title: "Cem Anos de Solidão",
        author: "Gabriel García Márquez",
        category: "ficcao",
        price: 18.50,
        oldPrice: 22.00,
        description: "Uma saga épica sobre a família Buendía e a cidade mítica de Macondo. Márquez tece uma narrativa fantástica que mistura realidade e magia, criando um dos romances mais influentes do século XX.",
        isbn: "978-0-06-088328-7",
        pages: 417,
        year: 1967,
        language: "Português",
        publisher: "Editorial Sudamericana",
        featured: true,
        promo: true,
        image: null,
        samplePages: [
            "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=600&h=800&fit=crop",
            "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&h=800&fit=crop",
            "https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=600&h=800&fit=crop",
            "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600&h=800&fit=crop",
            "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=600&h=800&fit=crop"
        ]
    },
    {
        id: 3,
        title: "Orgulho e Preconceito",
        author: "Jane Austen",
        category: "romance",
        price: 14.90,
        oldPrice: null,
        description: "Um clássico intemporal que narra a história de Elizabeth Bennet e sua complexa relação com o orgulhoso Sr. Darcy. Uma crítica social perspicaz envolta em romance e humor.",
        isbn: "978-0-14-143951-8",
        pages: 432,
        year: 1813,
        language: "Português",
        publisher: "Penguin Classics",
        featured: true,
        promo: false,
        image: null,
        samplePages: [
            "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600&h=800&fit=crop",
            "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&h=800&fit=crop",
            "https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=600&h=800&fit=crop",
            "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=600&h=800&fit=crop",
            "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600&h=800&fit=crop"
        ]
    },
    {
        id: 4,
        title: "1984",
        author: "George Orwell",
        category: "ficcao",
        price: 16.90,
        oldPrice: null,
        description: "Uma distopia visionária sobre totalitarismo, vigilância e controle. Winston Smith vive num mundo onde o Grande Irmão tudo vê e a verdade é constantemente reescrita.",
        isbn: "978-0-452-28423-4",
        pages: 328,
        year: 1949,
        language: "Português",
        publisher: "Secker & Warburg",
        featured: false,
        promo: false,
        image: null,
        samplePages: [
            "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=600&h=800&fit=crop",
            "https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=600&h=800&fit=crop",
            "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&h=800&fit=crop",
            "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600&h=800&fit=crop",
            "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=600&h=800&fit=crop"
        ]
    },
    {
        id: 5,
        title: "O Pequeno Príncipe",
        author: "Antoine de Saint-Exupéry",
        category: "infantil",
        price: 12.90,
        oldPrice: 15.90,
        description: "Uma fábula poética sobre amizade, amor e perda. A jornada do pequeno príncipe através de diferentes planetas oferece lições profundas sobre a vida e a natureza humana.",
        isbn: "978-0-15-601219-3",
        pages: 96,
        year: 1943,
        language: "Português",
        publisher: "Reynal & Hitchcock",
        featured: true,
        promo: true,
        image: null,
        samplePages: [
            "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600&h=800&fit=crop",
            "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&h=800&fit=crop",
            "https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=600&h=800&fit=crop",
            "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=600&h=800&fit=crop",
            "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600&h=800&fit=crop"
        ]
    },
    {
        id: 6,
        title: "Sapiens",
        author: "Yuval Noah Harari",
        category: "historia",
        price: 19.90,
        oldPrice: null,
        description: "Uma história audaciosa da humanidade desde a Idade da Pedra até o século XXI. Harari examina como o Homo sapiens conquistou o mundo e questiona o nosso futuro.",
        isbn: "978-0-06-231609-7",
        pages: 443,
        year: 2011,
        language: "Português",
        publisher: "Harvill Secker",
        featured: false,
        promo: false,
        image: null,
        samplePages: [
            "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=600&h=800&fit=crop",
            "https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=600&h=800&fit=crop",
            "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&h=800&fit=crop",
            "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600&h=800&fit=crop",
            "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=600&h=800&fit=crop"
        ]
    },
    {
        id: 7,
        title: "A Metamorfose",
        author: "Franz Kafka",
        category: "ficcao",
        price: 13.90,
        oldPrice: null,
        description: "Gregor Samsa acorda transformado num inseto monstruoso. Esta obra surreal explora temas de alienação, família e identidade numa narrativa perturbadora e inesquecível.",
        isbn: "978-0-553-21369-2",
        pages: 201,
        year: 1915,
        language: "Português",
        publisher: "Kurt Wolff Verlag",
        featured: false,
        promo: false,
        image: null,
        samplePages: [
            "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600&h=800&fit=crop",
            "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&h=800&fit=crop",
            "https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=600&h=800&fit=crop",
            "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=600&h=800&fit=crop",
            "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600&h=800&fit=crop"
        ]
    },
    {
        id: 8,
        title: "Mensagem",
        author: "Fernando Pessoa",
        category: "poesia",
        price: 11.90,
        oldPrice: null,
        description: "A única obra em português publicada em vida por Fernando Pessoa. Uma celebração épica da história e mitologia portuguesas, explorando a identidade nacional e o sebastianismo.",
        isbn: "978-972-23-0001-1",
        pages: 112,
        year: 1934,
        language: "Português",
        publisher: "Parceria António Maria Pereira",
        featured: true,
        promo: false,
        image: null,
        samplePages: [
            "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=600&h=800&fit=crop",
            "https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=600&h=800&fit=crop",
            "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&h=800&fit=crop",
            "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600&h=800&fit=crop",
            "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=600&h=800&fit=crop"
        ]
    },
    {
        id: 9,
        title: "Steve Jobs",
        author: "Walter Isaacson",
        category: "biografia",
        price: 21.90,
        oldPrice: 26.90,
        description: "A biografia autorizada do visionário co-fundador da Apple. Baseada em entrevistas exclusivas, revela a intensidade, perfeccionismo e paixão que definiram Steve Jobs.",
        isbn: "978-1-45-113157-4",
        pages: 656,
        year: 2011,
        language: "Português",
        publisher: "Simon & Schuster",
        featured: false,
        promo: true,
        image: null,
        samplePages: [
            "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600&h=800&fit=crop",
            "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&h=800&fit=crop",
            "https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=600&h=800&fit=crop",
            "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=600&h=800&fit=crop",
            "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600&h=800&fit=crop"
        ]
    },
    {
        id: 10,
        title: "Crime e Castigo",
        author: "Fiódor Dostoiévski",
        category: "ficcao",
        price: 17.90,
        oldPrice: null,
        description: "Um mergulho profundo na psicologia de um assassino. Raskólnikov comete um crime e enfrenta as consequências morais e psicológicas dos seus atos numa Rússia czarista.",
        isbn: "978-0-14-044913-2",
        pages: 671,
        year: 1866,
        language: "Português",
        publisher: "The Russian Messenger",
        featured: false,
        promo: false,
        image: null,
        samplePages: [
            "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=600&h=800&fit=crop",
            "https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=600&h=800&fit=crop",
            "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&h=800&fit=crop",
            "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600&h=800&fit=crop",
            "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=600&h=800&fit=crop"
        ]
    },
    {
        id: 11,
        title: "A Revolução dos Bichos",
        author: "George Orwell",
        category: "ficcao",
        price: 14.50,
        oldPrice: null,
        description: "Uma fábula política satírica sobre uma revolução que dá errado. Os animais da Quinta do Solar rebelam-se contra os humanos, mas a utopia rapidamente se transforma em tirania.",
        isbn: "978-0-452-28424-1",
        pages: 112,
        year: 1945,
        language: "Português",
        publisher: "Secker & Warburg",
        featured: false,
        promo: false,
        image: null,
        samplePages: [
            "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600&h=800&fit=crop",
            "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&h=800&fit=crop",
            "https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=600&h=800&fit=crop",
            "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=600&h=800&fit=crop",
            "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600&h=800&fit=crop"
        ]
    },
    {
        id: 12,
        title: "O Conde de Monte Cristo",
        author: "Alexandre Dumas",
        category: "ficcao",
        price: 19.90,
        oldPrice: 24.90,
        description: "Uma épica história de traição, prisão e vingança. Edmond Dantès é injustamente encarcerado e retorna como o misterioso Conde de Monte Cristo para punir aqueles que o traíram.",
        isbn: "978-0-14-044926-2",
        pages: 1276,
        year: 1844,
        language: "Português",
        publisher: "Pétion",
        featured: true,
        promo: true,
        image: null,
        samplePages: [
            "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=600&h=800&fit=crop",
            "https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=600&h=800&fit=crop",
            "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&h=800&fit=crop",
            "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600&h=800&fit=crop",
            "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=600&h=800&fit=crop"
        ]
    }
];

// Blog Posts Database
const blogPosts = [
    {
        id: 1,
        title: "A Importância da Leitura na Era Digital",
        excerpt: "Exploramos como a leitura de livros físicos continua essencial num mundo cada vez mais digital e conectado.",
        content: `
            <p>Vivemos numa era onde a informação está à distância de um clique. Smartphones, tablets e e-readers tornaram o acesso ao conteúdo mais fácil do que nunca. No entanto, a leitura de livros físicos mantém um lugar especial e insubstituível nas nossas vidas.</p>
            
            <h2>O Valor Tátil da Experiência</h2>
            <p>Segurar um livro, sentir o peso das páginas, o cheiro da tinta e do papel – estas são experiências sensoriais que conectam o leitor à obra de uma forma única. Estudos demonstram que a leitura física melhora a retenção e compreensão do conteúdo.</p>
            
            <h3>Benefícios Comprovados</h3>
            <p>Pesquisas científicas revelam que a leitura de livros físicos:</p>
            <ul>
                <li>Melhora a concentração e foco</li>
                <li>Reduz a fadiga ocular</li>
                <li>Promove um sono de melhor qualidade</li>
                <li>Cria uma experiência de leitura mais imersiva</li>
            </ul>
            
            <h2>Criar Rituais de Leitura</h2>
            <p>Na correria do dia a dia, criar momentos dedicados à leitura torna-se um ato de autocuidado. Um ritual matinal com café e um bom livro, ou minutos de leitura antes de dormir, podem transformar a nossa relação com a literatura.</p>
            
            <blockquote>"Um livro é um sonho que você segura nas suas mãos." - Neil Gaiman</blockquote>
            
            <p>A tecnologia não é inimiga da leitura – é uma aliada que pode coexistir harmoniosamente com os livros físicos. O importante é manter viva a paixão pela literatura, independentemente do formato.</p>
        `,
        author: "Maria Nogueira",
        date: "2025-10-15",
        readTime: "5 min",
        category: "Reflexões",
        featured: true,
        image: null
    },
    {
        id: 2,
        title: "Clássicos da Literatura que Todos Devem Ler",
        excerpt: "Uma seleção cuidada de obras clássicas que atravessam gerações e continuam relevantes nos dias de hoje.",
        content: `
            <p>Os clássicos da literatura são obras que resistem ao teste do tempo. São livros que, escritos há décadas ou até séculos, continuam a ressoar com leitores de todas as idades e culturas.</p>
            
            <h2>O Que Define um Clássico?</h2>
            <p>Um clássico literário não é apenas um livro antigo. É uma obra que explora temas universais da condição humana com profundidade, beleza e originalidade que permanecem relevantes através das gerações.</p>
            
            <h3>Nossa Seleção Essencial</h3>
            <p>Alguns clássicos que recomendamos:</p>
            
            <h3>1. Orgulho e Preconceito - Jane Austen</h3>
            <p>Uma crítica social brilhante disfarçada de romance. Austen domina a arte da ironia e cria personagens inesquecíveis.</p>
            
            <h3>2. 1984 - George Orwell</h3>
            <p>Uma distopia assustadoramente profética sobre vigilância, controlo e a manipulação da verdade.</p>
            
            <h3>3. Crime e Castigo - Dostoiévski</h3>
            <p>Um mergulho psicológico profundo na mente de um assassino e nas questões morais que atormentam a humanidade.</p>
            
            <blockquote>"Um clássico é um livro que nunca terminou de dizer o que tem a dizer." - Italo Calvino</blockquote>
            
            <p>Ler os clássicos é dialogar com as mentes mais brilhantes da história e compreender melhor não apenas o passado, mas também o presente e o futuro.</p>
        `,
        author: "João Nogueira",
        date: "2025-10-10",
        readTime: "7 min",
        category: "Recomendações",
        featured: true,
        image: null
    },
    {
        id: 3,
        title: "Como Criar o Ambiente Perfeito para Ler",
        excerpt: "Dicas práticas para criar um espaço de leitura confortável e inspirador na sua casa.",
        content: `
            <p>O ambiente onde lemos pode transformar completamente a nossa experiência literária. Um espaço bem pensado convida à leitura e torna cada sessão mais prazerosa e memorável.</p>
            
            <h2>Iluminação: A Base de Tudo</h2>
            <p>Uma boa iluminação é fundamental. A luz natural é ideal durante o dia, mas para sessões noturnas, invista numa luminária de leitura ajustável que não force a vista.</p>
            
            <h3>Elementos Essenciais</h3>
            <ul>
                <li><strong>Cadeira ou poltrona confortável:</strong> O conforto físico é essencial para longas sessões de leitura</li>
                <li><strong>Temperatura adequada:</strong> Um ambiente nem muito quente nem muito frio</li>
                <li><strong>Silêncio ou música ambiente:</strong> Dependendo da sua preferência pessoal</li>
                <li><strong>Mesa lateral:</strong> Para café, chá ou apoio do livro</li>
            </ul>
            
            <h2>Organização dos Livros</h2>
            <p>Uma estante bem organizada não só facilita a escolha do próximo livro como também cria um ambiente visualmente agradável. Organize por autor, género ou até cores – o importante é ter um sistema que funcione para si.</p>
            
            <h3>Toques Pessoais</h3>
            <p>Adicione elementos que tornem o espaço único:</p>
            <ul>
                <li>Plantas que purificam o ar</li>
                <li>Velas aromáticas suaves</li>
                <li>Mantas para dias mais frios</li>
                <li>Marcadores de livros especiais</li>
            </ul>
            
            <blockquote>"Uma casa sem livros é como um corpo sem alma." - Cícero</blockquote>
            
            <p>Criar o seu refúgio de leitura é um investimento no bem-estar e no prazer de ler. Com estes elementos, cada livro torna-se uma aventura ainda mais envolvente.</p>
        `,
        author: "Maria Nogueira",
        date: "2025-10-05",
        readTime: "6 min",
        category: "Dicas",
        featured: false,
        image: null
    },
    {
        id: 4,
        title: "Autores Portugueses que Marcaram a Literatura Mundial",
        excerpt: "Celebrando os escritores portugueses cujas obras transcenderam fronteiras e conquistaram leitores em todo o mundo.",
        content: `
            <p>Portugal, apesar de ser um país pequeno, produziu alguns dos escritores mais influentes e inovadores da literatura mundial. Vamos celebrar aqueles que levaram a língua portuguesa aos quatro cantos do mundo.</p>
            
            <h2>Fernando Pessoa: O Poeta dos Heterónimos</h2>
            <p>Pessoa revolucionou a poesia moderna criando múltiplas personalidades poéticas. Álvaro de Campos, Ricardo Reis, Alberto Caeiro e o semi-heterónimo Bernardo Soares são apenas alguns dos seus alter-egos literários.</p>
            
            <h3>José Saramago: Nobel da Literatura</h3>
            <p>O único escritor de língua portuguesa a receber o Prémio Nobel da Literatura, Saramago criou obras monumentais como "Ensaio sobre a Cegueira" e "Memorial do Convento", que exploram a condição humana com profundidade filosófica.</p>
            
            <h2>Eça de Queirós: O Realista</h2>
            <p>Com "Os Maias" e "O Crime do Padre Amaro", Eça trouxe o realismo à literatura portuguesa, retratando a sociedade portuguesa do século XIX com ironia e crítica social afiada.</p>
            
            <h3>Sophia de Mello Breyner: A Poeta do Mar</h3>
            <p>A sua poesia límpida e luminosa captura a essência do mar português e explora temas de justiça, beleza e verdade com uma voz única e inesquecível.</p>
            
            <blockquote>"Navegar é preciso, viver não é preciso." - Fernando Pessoa</blockquote>
            
            <p>Estes autores não apenas definiram a literatura portuguesa – influenciaram escritores em todo o mundo e continuam a inspirar novas gerações de leitores.</p>
        `,
        author: "João Nogueira",
        date: "2025-09-28",
        readTime: "8 min",
        category: "Autores",
        featured: true,
        image: null
    },
    {
        id: 5,
        title: "O Ressurgimento da Poesia Contemporânea",
        excerpt: "Como a poesia está a reconquistar leitores através das redes sociais e novas formas de expressão.",
        content: `
            <p>A poesia, muitas vezes considerada um género em declínio, está a viver um renascimento extraordinário. As redes sociais, em particular o Instagram, transformaram a forma como consumimos e partilhamos poesia.</p>
            
            <h2>Poetas do Instagram</h2>
            <p>Poetas como Rupi Kaur, Atticus e outros popularizaram um novo estilo de poesia: concisa, visual e profundamente emotiva. Estas obras curtas ressoam com uma geração que consome conteúdo em formato digital.</p>
            
            <h3>Acessibilidade e Democracia</h3>
            <p>As plataformas digitais democratizaram a poesia. Já não é necessário ser publicado por uma editora tradicional para alcançar milhões de leitores. Qualquer pessoa com talento e dedicação pode partilhar a sua voz.</p>
            
            <h2>O Formato Tradicional Ainda Importa</h2>
            <p>Apesar do sucesso digital, os livros de poesia físicos continuam a ter o seu lugar. Há algo especial em folhear um livro de poemas, descobrindo versos que falam diretamente à alma.</p>
            
            <h3>Slams e Performances</h3>
            <p>Os poetry slams trouxeram a poesia de volta aos palcos, transformando-a numa performance ao vivo que combina palavra, ritmo e emoção numa experiência única.</p>
            
            <blockquote>"A poesia é a arte de usar as palavras para fazer música." - Emily Dickinson</blockquote>
            
            <p>Seja digital ou impressa, performativa ou meditativa, a poesia continua a ser uma das formas mais poderosas de expressão humana.</p>
        `,
        author: "Maria Nogueira",
        date: "2025-09-20",
        readTime: "5 min",
        category: "Tendências",
        featured: false,
        image: null
    },
    {
        id: 6,
        title: "Livros para Presentear: Guia Completo",
        excerpt: "As melhores escolhas literárias para oferecer em qualquer ocasião, desde aniversários a celebrações especiais.",
        content: `
            <p>Um livro é um dos presentes mais significativos que podemos oferecer. Demonstra pensamento, cuidado e o desejo de partilhar algo verdadeiramente valioso. Mas como escolher o livro perfeito?</p>
            
            <h2>Conheça o Leitor</h2>
            <p>O primeiro passo é compreender os gostos e interesses da pessoa. Que géneros prefere? Lê ficção ou não-ficção? Gosta de clássicos ou obras contemporâneas?</p>
            
            <h3>Para Diferentes Ocasiões</h3>
            
            <h3>Aniversários</h3>
            <p>Escolha uma primeira edição ou edição especial de um autor favorito. Livros ilustrados de qualidade também são excelentes opções.</p>
            
            <h3>Graduações</h3>
            <p>Livros inspiradores sobre carreiras, biografias de figuras influentes ou obras filosóficas que estimulem a reflexão.</p>
            
            <h3>Casamentos</h3>
            <p>Livros sobre amor, poesia romântica ou obras que o casal possa ler juntos.</p>
            
            <h2>Edições Especiais</h2>
            <p>Para tornar o presente ainda mais especial, considere:</p>
            <ul>
                <li>Livros de capa dura com ilustrações únicas</li>
                <li>Edições anotadas com comentários do autor</li>
                <li>Box sets de séries completas</li>
                <li>Edições bilíngues para apaixonados por línguas</li>
            </ul>
            
            <h3>A Dedicatória Perfeita</h3>
            <p>Não se esqueça de escrever uma dedicatória pessoal. Algumas palavras sinceras transformam um livro num tesouro que será guardado para sempre.</p>
            
            <blockquote>"Um livro é um presente que pode ser aberto vezes sem conta." - Garrison Keillor</blockquote>
            
            <p>Lembre-se: o melhor presente literário é aquele escolhido com o coração, pensando verdadeiramente em quem vai recebê-lo.</p>
        `,
        author: "João Nogueira",
        date: "2025-09-12",
        readTime: "6 min",
        category: "Guias",
        featured: false,
        image: null
    }
];

// Export data for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { booksData, blogPosts };
}
