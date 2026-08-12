/* ==========================================================
   Minecraft SkinPack Validator
   fixer.js
   Sistema de correcciones opcionales
   ========================================================== */


const Fixer = {

    // Lista de geometrías oficiales de Minecraft Bedrock
    officialGeometry: [
        "geometry.humanoid.custom",
        "geometry.humanoid.customSlim",
        "geometry.humanoid",
        "geometry.humanoid.slim"
    ],


    /**
     * Aplica únicamente las correcciones seleccionadas
     *
     * options:
     *
     * {
     *   fixJson: true,
     *   syncLocalization: true,
     *   createMissingTexts: true,
     *   fixCase: true,
     *   syncSkins: true,
     *   removeDuplicatesOrUnused: true
     * }
     */

    async apply(zip, options, report) {

        let changes = [];


        /*
        ==========================================
        Reparación JSON
        ==========================================
        */

        if(options.fixJson){

            for(let file of Object.keys(zip.files)){

                if(zip.files[file].dir) continue;
                if(!file.endsWith(".json")) continue;


                let content =
                    await zip.files[file].async("string");


                // Si ya es JSON válido, no lo tocamos.
                try{
                    JSON.parse(content);
                    continue;
                }catch(e){}


                let fixed =
                    this.cleanJSON(content);


                try{

                    // Solo aplicamos el cambio si el resultado es
                    // realmente JSON válido; de lo contrario no
                    // sobrescribimos el archivo con algo a medio reparar.
                    JSON.parse(fixed);

                    zip.file(file, fixed);

                    changes.push(
                        `JSON reparado: ${file}`
                    );

                }catch(e){

                    changes.push(
                        `No se pudo reparar automáticamente ${file}: ${e.message}`
                    );

                }

            }
        }



        /*
        ==========================================
        Sincronizar localization_name
        ==========================================
        */

        if(options.syncLocalization){

            await this.syncLocalization(
                zip,
                changes
            );

        }



        /*
        ==========================================
        Crear textos faltantes
        ==========================================
        */

        if(options.createMissingTexts){

            await this.createMissingTexts(
                zip,
                changes
            );

        }



        /*
        ==========================================
        Corregir mayúsculas/minúsculas
        ==========================================
        */

        if(options.fixCase){

            await this.fixFileCase(
                zip,
                changes
            );

        }



        /*
        ==========================================
        Sincronizar skins (geometry / texture)
        ==========================================
        */

        if(options.syncSkins){

            await this.syncSkins(
                zip,
                changes
            );

        }



        /*
        ==========================================
        Remover skins repetidas o no usadas
        ==========================================
        */

        if(options.removeDuplicatesOrUnused){

            await this.removeDuplicatesOrUnused(
                zip,
                changes
            );

        }


        return changes;

    },



    /*
    --------------------------------------------------
    Limpieza básica de JSON
    --------------------------------------------------
    */

    cleanJSON(text){

        let fixed = text;


        // Quitar BOM al inicio del archivo
        fixed = fixed.replace(/^\uFEFF/, "");


        // Comillas "inteligentes" (typográficas) -> comillas normales
        fixed = fixed
            .replace(/[\u201C\u201D]/g, '"')
            .replace(/[\u2018\u2019]/g, "'");


        // Comentarios de línea // ... y de bloque /* ... */
        // (heurística simple; no distingue si están dentro de un string,
        // pero es un caso muy poco frecuente en skins.json)
        fixed = fixed.replace(/\/\*[\s\S]*?\*\//g, "");
        fixed = fixed.replace(/(^|[^:])\/\/[^\n\r]*/g, "$1");


        // Comillas simples 'valor' -> comillas dobles "valor"
        fixed = fixed.replace(
            /'([^'\\]*(?:\\.[^'\\]*)*)'/g,
            (m, inner) => `"${inner.replace(/"/g, '\\"')}"`
        );


        // Claves sin comillas: identificador: valor -> "identificador": valor
        fixed = fixed.replace(
            /([{,]\s*)([A-Za-z_][A-Za-z0-9_]*)(\s*:)/g,
            '$1"$2"$3'
        );


        // Comas sobrantes antes de } o ]
        fixed = fixed.replace(/,(\s*[}])/g, "$1");
        fixed = fixed.replace(/,(\s*])/g, "$1");


        // Comas faltantes entre objetos/arreglos consecutivos: "}{" o "][",
        // un error de sintaxis muy común al copiar/pegar skins a mano.
        fixed = fixed.replace(/}(\s*){/g, "},$1{");
        fixed = fixed.replace(/](\s*)\[/g, "],$1[");
        fixed = fixed.replace(/"(\s*\n\s*)"(?=\s*[:,])/g, '",$1"');


        return fixed;

    },




    /*
    --------------------------------------------------
    Sincronización localization_name
    --------------------------------------------------
    */

    async syncLocalization(zip, changes){


        let skinFile =
            Object.keys(zip.files)
            .find(x =>
                x.endsWith("skins.json")
            );


        if(!skinFile)
            return;



        let skins =
            JSON.parse(
                await zip.files[skinFile]
                .async("string")
            );



        // Buscar específicamente en_US.lang: es el idioma
        // obligatorio/principal en Minecraft Bedrock.
        let langFile =
            Object.keys(zip.files)
            .find(x =>
                /(^|\/)en_US\.lang$/i.test(x)
            );


        let isNewFile = false;


        if(!langFile){

            // Si hay otros .lang, usar su misma carpeta; si no hay
            // ninguno, crear "texts/" junto a donde esté skins.json
            // (no siempre en la raíz del zip): si el pack vive en
            // "skin.zip/persona/skins.json", el resultado debe ser
            // "skin.zip/persona/texts/en_US.lang", no "skin.zip/texts/...".
            let skinFolder =
                skinFile.includes("/")
                ? skinFile.substring(0, skinFile.lastIndexOf("/") + 1)
                : "";

            let anyLang =
                Object.keys(zip.files)
                .find(x =>
                    x.includes("texts/")
                    &&
                    x.endsWith(".lang")
                );

            let folder =
                anyLang
                ? anyLang.substring(0, anyLang.lastIndexOf("/") + 1)
                : `${skinFolder}texts/`;

            langFile = `${folder}en_US.lang`;
            isNewFile = true;

            changes.push(
                `Creado archivo ${langFile}`
            );
        }



        let lang =
            isNewFile
            ? ""
            : await zip.files[langFile]
              .async("string");



        let lines =
            lang.length
            ? lang.split(/\r?\n/)
            : [];



        // localization_name del PAQUETE (top-level en skins.json, junto
        // a "serialize_name"). Las claves de en_US.lang siguen el formato
        // skin.<packLocalizationName>.<skinLocalizationName>
        let packName =
            (typeof skins.localization_name === "string" && skins.localization_name.trim())
            ? skins.localization_name.trim()
            : null;



        for(let skin of skins.skins || []){


            let skinName =
                skin.localization_name;


            if(!skinName)
                continue;


            let key =
                packName
                ? `skin.${packName}.${skinName}`
                : `skin.${skinName}`;


            let exists =
                lines.some(
                    l =>
                    l.startsWith(key+"=")
                );


            if(!exists){

                lines.push(
                    `${key}=${skinName}`
                );


                changes.push(
                    `Creada entrada ${key}`
                );

            }

        }



        zip.file(
            langFile,
            lines.join("\n")
        );

    },





    /*
    --------------------------------------------------
    Crear textos faltantes
    --------------------------------------------------
    --------------------------------------------------
    (Separado para futuras traducciones)
    --------------------------------------------------
    */

    async createMissingTexts(zip, changes){

        // Actualmente comparte lógica
        // con syncLocalization.
        // Se mantiene separado porque
        // después permitirá crear:
        // es_ES.lang
        // en_US.lang
        // pt_BR.lang


        await this.syncLocalization(
            zip,
            changes
        );

    },






    /*
    --------------------------------------------------
    Corregir referencias por mayúsculas
    --------------------------------------------------
    */

    async fixFileCase(zip, changes){


        let skinFile =
            Object.keys(zip.files)
            .find(x => /(^|\/)skins\.json$/i.test(x));


        if(!skinFile)
            return;


        let skins;

        try{
            skins = JSON.parse(
                await zip.files[skinFile].async("string")
            );
        }catch(e){
            return;
        }


        let pngFiles =
            Object.keys(zip.files)
            .filter(
                f =>
                /\.png$/i.test(f) &&
                !zip.files[f].dir
            );


        let modified = false;


        for(let skin of skins.skins || []){

            ["texture","cape"].forEach(field=>{

                if(!skin[field])
                    return;


                let exactMatch =
                    pngFiles.some(
                        f =>
                        f.split("/").pop() === skin[field]
                    );

                if(exactMatch)
                    return;


                let ciMatch =
                    pngFiles.find(
                        f =>
                        f.split("/").pop().toLowerCase()
                        === skin[field].toLowerCase()
                    );

                if(ciMatch){

                    let realName =
                        ciMatch.split("/").pop();

                    changes.push(
                        `Corregido "${field}" de "${skin.localization_name || "(sin nombre)"}": "${skin[field]}" → "${realName}"`
                    );

                    skin[field] = realName;
                    modified = true;

                }

            });

        }


        if(modified){

            zip.file(
                skinFile,
                JSON.stringify(skins, null, 2)
            );

        }

    },






    /*
    --------------------------------------------------
    Utilidades de similitud de texto (para "Sincronizar skins")
    --------------------------------------------------
    */

    // Quita el prefijo "geometry." y la extensión ".png", pasa a
    // minúsculas y elimina todo lo que no sea letra/número. Así
    // "Egg_Model", "egg.model" y "geometry.egg.model" se comparan de
    // forma justa entre sí.
    normalizeForMatch(str){

        return String(str || "")
            .replace(/^geometry\./i, "")
            .replace(/\.png$/i, "")
            .toLowerCase()
            .replace(/[^a-z0-9]/g, "");

    },


    // Distancia de Levenshtein (número mínimo de ediciones para pasar de
    // "a" a "b"). Implementación clásica de dos filas.
    levenshtein(a, b){

        const m = a.length, n = b.length;

        if(!m) return n;
        if(!n) return m;

        let prev = new Array(n + 1);
        let curr = new Array(n + 1);

        for(let j = 0; j <= n; j++) prev[j] = j;

        for(let i = 1; i <= m; i++){

            curr[0] = i;

            for(let j = 1; j <= n; j++){

                const cost = a[i - 1] === b[j - 1] ? 0 : 1;

                curr[j] = Math.min(
                    prev[j] + 1,
                    curr[j - 1] + 1,
                    prev[j - 1] + cost
                );

            }

            [prev, curr] = [curr, prev];

        }

        return prev[n];

    },


    // Similitud entre 0 (nada que ver) y 1 (idénticos), tras normalizar
    // ambos textos.
    similarity(a, b){

        const na = this.normalizeForMatch(a);
        const nb = this.normalizeForMatch(b);

        if(!na || !nb) return 0;
        if(na === nb) return 1;

        if(na.includes(nb) || nb.includes(na)){
            const shorter = Math.min(na.length, nb.length);
            const longer = Math.max(na.length, nb.length);
            return 0.75 + 0.25 * (shorter / longer);
        }

        const dist = this.levenshtein(na, nb);
        const maxLen = Math.max(na.length, nb.length);

        return maxLen ? 1 - (dist / maxLen) : 0;

    },


    // Entre una lista de candidatos y una o más claves de búsqueda,
    // regresa el candidato más parecido, o null si ninguno alcanza el
    // umbral mínimo o si los dos mejores están demasiado cerca (en ese
    // caso es más seguro no adivinar).
    bestMatch(candidates, keys, threshold = 0.55, margin = 0.08){

        let best = null, bestScore = 0, second = 0;

        for(const candidate of candidates){

            let score = 0;

            for(const key of keys){
                score = Math.max(score, this.similarity(candidate, key));
            }

            if(score > bestScore){
                second = bestScore;
                bestScore = score;
                best = candidate;
            }else if(score > second){
                second = score;
            }

        }

        if(!best || bestScore < threshold) return null;
        if(second > 0 && bestScore - second < margin) return null;

        return best;

    },



    /*
    --------------------------------------------------
    Sincronizar skins: corrige referencias de "geometry" y
    "texture" mal escritas buscando, dentro de geometry.json y
    de las imágenes del paquete, el nombre más parecido al
    localization_name (o al valor actual, si también sirve de
    pista) de cada skin. No toca nada que ya sea válido: esto
    es una corrección real (modifica skins.json), no solo un
    reporte de lo que falta.
    --------------------------------------------------
    */

    async syncSkins(zip, changes){


        let skinFile =
            Object.keys(zip.files)
            .find(x => x.endsWith("skins.json"));


        if(!skinFile)
            return;


        let skins;

        try{
            skins = JSON.parse(
                await zip.files[skinFile].async("string")
            );
        }catch(e){
            return;
        }



        // Geometrías disponibles: geometry.json (ambos formatos) +
        // geometrías oficiales de Minecraft.
        let geoFile =
            Object.keys(zip.files)
            .find(x => /(^|\/)geometry\.json$/i.test(x));

        let availableGeometry = [];

        if(geoFile){

            try{

                let json = JSON.parse(
                    await zip.files[geoFile].async("string")
                );

                if(json["minecraft:geometry"]){
                    json["minecraft:geometry"].forEach(g => {
                        if(g?.description?.identifier){
                            availableGeometry.push(g.description.identifier);
                        }
                    });
                }

                // Formato antiguo: claves de nivel superior tipo
                // "geometry.egg": { ... }
                Object.keys(json).forEach(k => {
                    if(/^geometry\./i.test(k)){
                        availableGeometry.push(k);
                    }
                });

            }catch(e){}

        }

        let availableGeometryLower =
            new Set(availableGeometry.map(id => id.toLowerCase()));

        // Las geometrías oficiales son válidas aunque no aparezcan en
        // geometry.json, pero no tiene sentido "sincronizar" hacia ellas
        // por similitud de nombre (un modelo humanoide normal no debería
        // reasignarse por accidente), así que solo se usan para decidir
        // si la geometría actual YA es válida, no como candidatas.
        this.officialGeometry.forEach(id => availableGeometryLower.add(id.toLowerCase()));



        // Texturas disponibles dentro del paquete.
        let pngFiles =
            Object.keys(zip.files)
            .filter(f => /\.png$/i.test(f) && !zip.files[f].dir)
            .map(f => f.split("/").pop());

        let pngLower =
            new Set(pngFiles.map(p => p.toLowerCase()));


        let modified = false;


        for(let skin of skins.skins || []){

            let name = skin.localization_name || "";


            // ---- geometry ----
            let geoOk =
                skin.geometry &&
                availableGeometryLower.has(skin.geometry.toLowerCase());

            if(!geoOk && availableGeometry.length){

                let keys = [name, skin.geometry || ""].filter(Boolean);
                let match = this.bestMatch(availableGeometry, keys);

                if(match){

                    changes.push(
                        `Skin sincronizada "${name || "(sin nombre)"}": geometry "${skin.geometry || "(vacío)"}" → "${match}" (coincidencia por nombre parecido en geometry.json).`
                    );

                    skin.geometry = match;
                    modified = true;

                }

            }


            // ---- texture ----
            let texOk =
                skin.texture &&
                pngLower.has(skin.texture.toLowerCase());

            if(!texOk && pngFiles.length){

                let keys = [name, skin.texture || ""].filter(Boolean);
                let match = this.bestMatch(pngFiles, keys);

                if(match){

                    changes.push(
                        `Skin sincronizada "${name || "(sin nombre)"}": texture "${skin.texture || "(vacío)"}" → "${match}" (coincidencia por nombre parecido con una imagen del paquete).`
                    );

                    skin.texture = match;
                    modified = true;

                }

            }

        }


        if(modified){

            zip.file(
                skinFile,
                JSON.stringify(skins, null, 2)
            );

        }


    },



    /*
    --------------------------------------------------
    Remover skins repetidas o no usadas
    --------------------------------------------------
    Repetidas: mismo localization_name ya visto antes
               (se conserva la primera aparición).
    No usadas: la textura que la skin referencia no
               existe físicamente dentro del paquete,
               por lo que la skin nunca podría mostrarse.
    --------------------------------------------------
    */

    async removeDuplicatesOrUnused(zip, changes){


        let skinFile =
            Object.keys(zip.files)
            .find(
                x =>
                x.endsWith("skins.json")
            );


        if(!skinFile)
            return;


        let skins =
            JSON.parse(
                await zip.files[skinFile]
                .async("string")
            );


        let pngFiles =
            Object.keys(zip.files)
            .filter(
                x =>
                /\.png$/i.test(x)
                &&
                !zip.files[x].dir
            );

        let pngNamesLower =
            pngFiles.map(
                p => p.split("/").pop().toLowerCase()
            );


        let seenNames = new Set();
        let kept = [];


        for(let skin of skins.skins || []){


            let name =
                skin.localization_name;


            // Repetida: ya se vio antes ese localization_name
            if(name && seenNames.has(name)){

                changes.push(
                    `Skin repetida removida: ${name}`
                );

                continue;

            }


            // No usada: la textura no existe en el paquete
            let textureExists =
                skin.texture
                &&
                pngNamesLower.includes(
                    skin.texture.toLowerCase()
                );


            if(!textureExists){

                changes.push(
                    `Skin no usada removida: ${name || "(sin localization_name)"} (textura "${skin.texture || "(sin textura)"}" no encontrada).`
                );

                continue;

            }


            if(name)
                seenNames.add(name);


            kept.push(skin);

        }


        if(kept.length !== (skins.skins || []).length){

            skins.skins = kept;

            zip.file(
                skinFile,
                JSON.stringify(skins, null, 2)
            );

        }


    }


};