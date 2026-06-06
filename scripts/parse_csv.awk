BEGIN {
  FPAT = "([^,]*)|(\"[^\"]*\")"
  count = 0
}
NR == 1 { next }
{
  for(i=1;i<=NF;i++) {
    gsub(/^"/, "", $i)
    gsub(/"$/, "", $i)
  }

  day   = $1
  camp  = $2
  adset = $3
  ad    = $4
  impr  = int($6+0)
  gasto_raw = $10; gsub(/,/, ".", gasto_raw)
  gasto = gasto_raw + 0
  cliques = int($11+0)
  leads_raw = $12+0
  leads_val = int(leads_raw)

  if (index(camp, "LC25") == 0) next

  match(camp, /LC[0-9]+/)
  lc = substr(camp, RSTART, RLENGTH)

  ukey = day "__" camp "__" adset "__" ad

  # Escapar aspas simples para SQL
  gsub(/'/, "''", ukey)
  gsub(/'/, "''", camp)
  gsub(/'/, "''", adset)
  gsub(/'/, "''", ad)

  count++

  printf "INSERT INTO trafego_meta (unique_key,id_lancamento,data,campanha,conjunto_anuncio,anuncio,impressoes,cliques_no_link,total_gasto,leads) VALUES ('%s','%s','%s','%s','%s','%s',%d,%d,%.2f,%d) ON CONFLICT (unique_key) DO UPDATE SET leads=GREATEST(trafego_meta.leads,EXCLUDED.leads), total_gasto=EXCLUDED.total_gasto, impressoes=EXCLUDED.impressoes;\n", ukey, lc, day, camp, adset, ad, impr, cliques, gasto, leads_val
}
END {
  print "-- LC25 rows processados: " count
}
