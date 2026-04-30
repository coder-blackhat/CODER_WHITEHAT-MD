import axios from 'axios'
import config from '../config.js'

export default {
    name: "movie",
    aliases: ["film", "xcasper"],
    run: async ({ sock, m, args, from }) => {
        if (!args[0]) return await sock.sendMessage(from, { text: `Usage: ${config.prefix}movie <title>\nExample: ${config.prefix}movie Avatar` })
        const query = args.join(" ")
        await sock.sendMessage(from, { react: { text: "🎬", key: m.key } })
        try {
            const res = await axios.get(`https://apis.xwolf.space/api/xcasper/search?q=${encodeURIComponent(query)}&type=movie&page=1&perPage=10`, { timeout: 30000 })
            const data = res.data.result || res.data
            
            if (!data || data.length === 0) {
                return await sock.sendMessage(from, { text: `No movies found for "${query}"` })
            }
            
            const movie = Array.isArray(data)? data[0] : data
            const text = `*Movie Found 🎬*\n\n*Title:* ${movie.title || movie.name}\n*Year:* ${movie.year || movie.release_date || 'N/A'}\n*Rating:* ⭐ ${movie.rating || movie.vote_average || 'N/A'}\n*Genre:* ${movie.genre || movie.genres?.join(', ') || 'N/A'}\n*Plot:* ${movie.plot || movie.overview || 'No description'}\n*Runtime:* ${movie.runtime || 'N/A'}\n*IMDB:* ${movie.imdb_id || 'N/A'}`
            
            if (movie.poster || movie.poster_path) {
                await sock.sendMessage(from, { 
                    image: { url: movie.poster || movie.poster_path }, 
                    caption: text 
                })
            } else {
                await sock.sendMessage(from, { text })
            }
        } catch (e) {
            await sock.sendMessage(from, { text: "Movie search failed" })
        }
    }
}
