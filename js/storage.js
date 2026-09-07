/* ============================================================
   PERSISTANCE — brouillon local (localStorage)

   Couche volontairement isolée. Le jour où l'on branche Supabase,
   c'est essentiellement ce fichier qui évolue : on garde la même
   petite API (save / load / clear) et l'on ajoute list / get / remove
   pour plusieurs séquences côté serveur.
   ============================================================ */
const Draft = (function(){
  const KEY = 'cds:draft:v1';

  const available = (function(){
    try{
      const k='__cds_test__';
      localStorage.setItem(k,'1');
      localStorage.removeItem(k);
      return true;
    }catch(e){
      return false; // navigation privée, stockage bloqué, etc.
    }
  })();

  function save(payload){
    if(!available) return;
    try{
      localStorage.setItem(KEY, JSON.stringify({ savedAt: Date.now(), payload }));
    }catch(e){ /* quota atteint : on ignore silencieusement */ }
  }

  function load(){
    if(!available) return null;
    try{
      const raw = localStorage.getItem(KEY);
      if(!raw) return null;
      const obj = JSON.parse(raw);
      if(!obj || !obj.payload || !obj.payload.form) return null;
      return obj;
    }catch(e){
      return null;
    }
  }

  function clear(){
    if(!available) return;
    try{ localStorage.removeItem(KEY); }catch(e){}
  }

  return { save, load, clear, available };
})();
