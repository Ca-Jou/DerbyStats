import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Skater } from '../types/Skater'
import DeleteButton from '../components/DeleteButton'
import EditSkaterForm from '../components/EditSkaterForm'

function SkaterDetails() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [skater, setSkater] = useState<Skater | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)

  useEffect(() => {
    async function fetchSkater() {
      try {
        setLoading(true)

        const { data: skaterData, error: skaterError } = await supabase
          .from('skaters')
          .select(`
            id,
            number,
            name,
            teams_skaters(
              team_id
            )
          `)
          .eq('id', id)
          .single()

        if (skaterError) throw skaterError

        const teamIDs = skaterData.teams_skaters.flatMap((t) => t.team_id)

        const {data: teamData, error: teamError} = await supabase
          .from('teams')
          .select(`
            id,
            name,
            city,
            country,
            light_color,
            dark_color
          `)
          .in('id', teamIDs)

        if (teamError) throw teamError

        const skater = {
          id: skaterData.id,
          name: skaterData.name,
          number: skaterData.number,
          teams: teamData
        }
        setSkater(skater)
      } catch (error) {
        setError(error instanceof Error ? error.message : 'An error occurred')
      } finally {
        setLoading(false)
      }
    }

    if (id) {
      fetchSkater()
    }
  }, [id])

  if (loading) {
    return (
      <div className="container mt-4">
        <div className="d-flex justify-content-center">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Loading skater details...</span>
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

  if (!skater) {
    return (
      <div className="container mt-4">
        <div className="alert alert-warning" role="alert">
          Skater not found
        </div>
      </div>
    )
  }

  return (
    <div className="container mt-4">
      <div className="row">
        <div className="col-12">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h1 className="mb-0">Skater Details</h1>
            <div>
              <button className="btn btn-secondary me-2" onClick={() => navigate('/skaters')}>
                <i className="bi bi-arrow-left me-2"></i>
                Back
              </button>
              <button className="btn btn-primary me-2" onClick={() => setShowEditModal(true)}>
                <i className="bi bi-pencil-fill me-2"></i>
                Edit
              </button>
              <DeleteButton
                entityType="skaters"
                id={skater.id}
                onSuccess={() => navigate('/skaters')}
                onError={(error) => setError(error.message)}
                confirmMessage="Are you sure you want to delete this skater? This action cannot be undone!"
              />
            </div>
          </div>

          <div className="card">
            <div className="card-body">
              <div className="row mb-3">
                <div className="col-md-3">
                  <strong>Number:</strong>
                </div>
                <div className="col-md-9">
                  {skater.number}
                </div>
              </div>
              <div className="row mb-3">
                <div className="col-md-3">
                  <strong>Name:</strong>
                </div>
                <div className="col-md-9">
                  {skater.name}
                </div>
              </div>
              {skater.teams && skater.teams.length > 0 && (
                <div className="row mb-3">
                  <div className="col-md-3">
                    <strong>Teams:</strong>
                  </div>
                  <div className="col-md-9">
                    {skater.teams.map((team) => (
                      <div key={team.id} className="mb-2">
                        <div><strong>{team.name}</strong></div>
                        <div className="text-muted">{team.city}, {team.country}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <EditSkaterForm
        show={showEditModal}
        skater={skater}
        onClose={() => setShowEditModal(false)}
        onSuccess={(updatedSkater) => {
          setSkater({ ...skater, ...updatedSkater })
          setShowEditModal(false)
        }}
        onError={(error) => {
          setError(error.message)
        }}
      />
    </div>
  )
}

export default SkaterDetails
