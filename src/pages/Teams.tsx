import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Team } from '../types/Skater'
import DeleteButton from "../components/DeleteButton"
import CreateTeamForm from "../components/CreateTeamForm"
import EditTeamForm from "../components/EditTeamForm"

function Teams() {
  const navigate = useNavigate()
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [editingTeam, setEditingTeam] = useState<Team | null>(null)

  useEffect(() => {
    async function fetchTeams() {
      try {
        setLoading(true)

        const { data, error } = await supabase
          .from('teams')
          .select(`
            id,
            name,
            city,
            country,
            light_color,
            dark_color
          `)

        if (error) throw error

        setTeams(data || [])
      } catch (error) {
        setError(error instanceof Error ? error.message : 'An error occurred')
      } finally {
        setLoading(false)
      }
    }

    fetchTeams()
  }, [])

  if (loading) {
    return (
      <div className="container mt-4">
        <div className="d-flex justify-content-center">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Loading teams...</span>
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
            <h1 className="mb-0">Teams</h1>
            <button
              className="btn btn-outline-primary"
              onClick={() => setShowModal(true)}
            >
              <i className="bi bi-plus-circle me-2"></i>
              Add Team
            </button>
          </div>
          <div className="table-responsive">
            <table className="table table-striped table-hover">
              <thead className="table-dark">
                <tr>
                  <th>Name</th>
                  <th>City</th>
                  <th>Country</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {teams.map((team) => (
                  <tr key={team.id}>
                    <td>{team.name}</td>
                    <td>{team.city}</td>
                    <td>{team.country}</td>
                    <td>
                      <button
                        className="btn btn-outline-primary btn-sm me-2"
                        onClick={() => navigate(`/teams/${team.id}`)}
                      >
                        <i className="bi bi-eye-fill"></i>
                      </button>
                      <button
                        className="btn btn-outline-primary btn-sm me-2"
                        onClick={() => setEditingTeam(team)}
                      >
                        <i className="bi bi-pencil-fill"></i>
                      </button>
                      <DeleteButton
                        entityType={'teams'}
                        id={team.id}
                        onSuccess={() => {
                          setTeams(teams.filter(t => t.id !== team.id))
                        }}
                        onError={(error) => {
                          setError(error.message)
                        }}
                        confirmMessage="Are you sure you want to delete this team? This action cannot be undone!"
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

      <CreateTeamForm
        show={showModal}
        onClose={() => setShowModal(false)}
        onSuccess={(newTeam) => {
          setTeams([...teams, newTeam])
          setShowModal(false)
        }}
        onError={(error) => {
          setError(error.message)
        }}
      />

      {editingTeam && (
        <EditTeamForm
          show={true}
          team={editingTeam}
          onClose={() => setEditingTeam(null)}
          onSuccess={(updatedTeam) => {
            setTeams(teams.map(t => t.id === updatedTeam.id ? updatedTeam : t))
            setEditingTeam(null)
          }}
          onError={(error) => {
            setError(error.message)
          }}
        />
      )}
    </div>
  )
}

export default Teams