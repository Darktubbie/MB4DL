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
     *   fixGeometry: true
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

                if(file.endsWith(".json")){

                    let content =
                        await zip.files[file].async("string");


                    let fixed =
                        this.cleanJSON(content);


                    if(content !== fixed){

                        zip.file(file, fixed);

                        changes.push(
                            `JSON reparado: ${file}`
                        );
                    }
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
        Geometrías
        ==========================================
        */

        if(options.fixGeometry){

            await this.fixGeometry(
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

        return text

        // elimina comas antes de }
        .replace(/,(\s*[}])/g, "$1")

        // elimina comas antes de ]
        .replace(/,(\s*])/g, "$1");

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

            // Si hay otros .lang, usar su misma carpeta;
            // si no hay ninguno, usar "texts/" por defecto.
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
                : "texts/";

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
    Corrección de geometrías
    --------------------------------------------------
    */

    async fixGeometry(zip, changes){


        let geoFile =
            Object.keys(zip.files)
            .find(
                x =>
                /(^|\/)geometry\.json$/i.test(x)
            );



        let available = [];



        if(geoFile){


            try{


                let json =
                    JSON.parse(
                        await zip.files[geoFile]
                        .async("string")
                    );


                if(json["minecraft:geometry"]){


                    json["minecraft:geometry"]
                    .forEach(g=>{

                        if(g?.description?.identifier){
                            available.push(
                                g.description.identifier
                            );
                        }

                    });

                }


                // Formato antiguo: claves de nivel superior tipo
                // "geometry.egg": { ... }
                Object.keys(json).forEach(k => {
                    if(/^geometry\./i.test(k)){
                        available.push(k);
                    }
                });


            }catch(e){}

        }



        available.push(
            ...this.officialGeometry
        );



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



        let availableLower =
            available.map(id => id.toLowerCase());


        for(let skin of skins.skins || []){


            if(
                skin.geometry &&
                !availableLower.includes(
                    skin.geometry.toLowerCase()
                )
            ){

                changes.push(
                    `Geometría faltante: ${skin.geometry}`
                );

            }

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
