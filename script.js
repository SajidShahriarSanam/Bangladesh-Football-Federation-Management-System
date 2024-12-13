document.addEventListener("DOMContentLoaded", () => {
    // Fetch and display metrics
    fetchMetrics();
});

async function fetchMetrics() {
    try {
        // Fetch total teams
        const teamsResponse = await fetch('http://localhost:3000/api/teams');
        const teamsData = await teamsResponse.json();
        document.getElementById("total-teams").textContent = teamsData.length;

        // Fetch total players
        const playersResponse = await fetch('http://localhost:3000/api/players');
        const playersData = await playersResponse.json();
        document.getElementById("total-players").textContent = playersData.length;

        // Fetch ongoing tournaments
        const tournamentsResponse = await fetch('http://localhost:3000/api/tournaments');
        const tournamentsData = await tournamentsResponse.json();
        const ongoingTournaments = tournamentsData.filter(t => new Date(t.end_date) >= new Date());
        document.getElementById("ongoing-tournaments").textContent = ongoingTournaments.length;

        // Fetch upcoming matches
        const matchesResponse = await fetch('http://localhost:3000/api/matches');
        const matchesData = await matchesResponse.json();
        const upcomingMatches = matchesData.filter(m => new Date(m.date) >= new Date());
        document.getElementById("upcoming-matches").textContent = upcomingMatches.length;
    } catch (error) {
        console.error("Error fetching metrics:", error);
    }
}

// Fetch and display metrics for Media and Stadiums
async function fetchMediaAndStadiums() {
    try {
        // Fetch media
        const mediaResponse = await fetch('http://localhost:3000/api/media');
        const mediaData = await mediaResponse.json();
        console.log("Media data:", mediaData); // You can populate this in the media section

        // Fetch stadiums
        const stadiumsResponse = await fetch('http://localhost:3000/api/stadiums');
        const stadiumsData = await stadiumsResponse.json();
        console.log("Stadium data:", stadiumsData); // You can populate this in the stadiums section
    } catch (error) {
        console.error("Error fetching media or stadiums:", error);
    }
}


// Initialize Timeline Data
let timelineData = [];

// Fetch tournaments and teams when the page loads
window.onload = async function() {
    await loadTournaments();
    await loadTeams();
    await loadMatches();
};

// Function to fetch and populate tournaments
async function loadTournaments() {
    const response = await fetch('/api/tournaments');
    const tournaments = await response.json();
    
    const tournamentSelect = document.getElementById('tournamentSelect');
    tournaments.forEach(tournament => {
        const option = document.createElement('option');
        option.value = tournament.tournament_id;
        option.textContent = tournament.name;
        tournamentSelect.appendChild(option);
    });
}

// Function to fetch and populate teams
async function loadTeams() {
    const response = await fetch('/api/teams');
    const teams = await response.json();
    
    const teamSelect = document.getElementById('teamSelect');
    teams.forEach(team => {
        const option = document.createElement('option');
        option.value = team.team_id;
        option.textContent = team.name;
        teamSelect.appendChild(option);
    });
}

// Function to load matches based on selected filters
async function loadMatches() {
    const tournamentId = document.getElementById('tournamentSelect').value;
    const teamId = document.getElementById('teamSelect').value;
    let url = `/api/matches`;

    if (tournamentId) {
        url += `?tournament_id=${tournamentId}`;
    }
    if (teamId) {
        url += `&team_id=${teamId}`;
    }

    const response = await fetch(url);
    const matches = await response.json();
    
    timelineData = matches.map(match => ({
        id: match.match_id,
        content: `${match.team1} vs ${match.team2}`,
        start: match.match_date + "T" + match.match_time,
        group: match.tournament,  // Optional: Can be used for grouping events by tournament
        title: `${match.team1} vs ${match.team2}<br>Stadium: ${match.stadium}<br>Date: ${match.match_date}`,
    }));

    createTimeline();
}

