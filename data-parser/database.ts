import pg from "pg";

const pool = new pg.Pool({
    connectionString: "postgres://postgres:Insured345@db-config-sg.c10q828o8if9.ap-south-1.rds.amazonaws.com:5432/postgres"
});

export async function getDetails (query: string) {
    const client = await pool.connect()
    let res
    try {
      await client.query('BEGIN')
      try {                        
        res = await client.query(query)
        console.log('data inserted');
        await client.query('COMMIT')
      } catch (err) {
        await client.query('ROLLBACK')
        console.log('Error in insertion :'+err);
        throw err
      }
    } finally {
      client.release()
    }
    return res
  }

