import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Skater } from '../types/Skater'

function Skaters() {
  const [skaters, setSkaters] = useState<Skater[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchSkaters() {
      try {
        setLoading(true)
        const { data, error } = await supabase
          .from('skaters')
          .select('*')

        if (error) throw error

        setSkaters(data || [])
      } catch (error) {
        setError(error instanceof Error ? error.message : 'An error occurred')
      } finally {
        setLoading(false)
      }
    }

    fetchSkaters()
  }, [])

  if (loading) {
    return (
      <div className="container mt-4">
        <div className="d-flex justify-content-center">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Loading skaters...</span>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mt-4">
        <div className="alert alert-danger" role="alert">
          Error: {error}
        </div>
      </div>
    )
  }

  return (
    <div className="container mt-4">
      <div className="row">
        <div className="col-12">
          <h1 className="mb-4">Skaters</h1>
          {skaters.length === 0 ? (
            <div className="alert alert-info">
              No skaters found.
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-striped table-hover">
                <thead className="table-dark">
                  <tr>
                    <th>Name</th>
                    <th>Position</th>
                    <th>Jersey Number</th>
                  </tr>
                </thead>
                <tbody>
                  {skaters.map((skater) => (
                    <tr key={skater.id}>
                      <td>{skater.name}</td>
                      <td>{skater.position}</td>
                      <td>{skater.jersey_number}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Skaters