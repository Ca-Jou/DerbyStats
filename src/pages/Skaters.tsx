import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Skater } from '../types/Skater'
import DeleteButton from "../components/DeleteButton"
import CreateSkaterForm from "../components/CreateSkaterForm"
import EditSkaterForm from "../components/EditSkaterForm"

function Skaters() {
  const navigate = useNavigate()
  const [skaters, setSkaters] = useState<Skater[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [editingSkater, setEditingSkater] = useState<Skater | null>(null)

  useEffect(() => {
    async function fetchSkaters() {
      try {
        setLoading(true)

        const { data, error } = await supabase
          .from('skaters')
          .select(`
            id,
            number,
            name
          `)

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
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h1 className="mb-0">Skaters</h1>
            <button
              className="btn btn-outline-primary"
              onClick={() => setShowModal(true)}
            >
              <i className="bi bi-plus-circle me-2"></i>
              Add Skater
            </button>
          </div>
            <div className="table-responsive">
              <table className="table table-striped table-hover">
                <thead className="table-dark">
                  <tr>
                    <th>Number</th>
                    <th>Name</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {skaters.map((skater) => (
                    <tr key={skater.id}>
                      <td>{skater.number}</td>
                      <td>{skater.name}</td>
                      <td>
                        <button
                          className="btn btn-outline-primary btn-sm me-2"
                          onClick={() => navigate(`/skaters/${skater.id}`)}
                        >
                          <i className="bi bi-eye-fill"></i>
                        </button>
                        <button
                          className="btn btn-outline-primary btn-sm me-2"
                          onClick={() => setEditingSkater(skater)}
                        >
                          <i className="bi bi-pencil-fill"></i>
                        </button>
                        <DeleteButton
                          entityType={'skaters'}
                          id={skater.id}
                          onSuccess={() => {
                            setSkaters(skaters.filter(s => s.id !== skater.id))
                          }}
                          onError={(error) => {
                            setError(error.message)
                          }}
                          confirmMessage="Are you sure you want to delete this skater? This action cannot be undone!"
                          size="sm"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
        </div>
      </div>

      <CreateSkaterForm
        show={showModal}
        onClose={() => setShowModal(false)}
        onSuccess={(newSkater) => {
          setSkaters([...skaters, newSkater])
          setShowModal(false)
        }}
        onError={(error) => {
          setError(error.message)
        }}
      />

      {editingSkater && (
        <EditSkaterForm
          show={true}
          skater={editingSkater}
          onClose={() => setEditingSkater(null)}
          onSuccess={(updatedSkater) => {
            setSkaters(skaters.map(s => s.id === updatedSkater.id ? updatedSkater : s))
            setEditingSkater(null)
          }}
          onError={(error) => {
            setError(error.message)
          }}
        />
      )}
    </div>
  )
}

export default Skaters
