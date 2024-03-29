import pg from "pg";

const pool = new pg.Pool({
    // connectionString: "<provide url>"     
    // connectionString: ""
});

export async function getDetails (query: string) {  
    const client = await pool.connect()  
    let res
    try {
      await client.query('BEGIN')
  
      try {                                        
        res = await client.query(query)        
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

