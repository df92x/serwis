import Foundation

enum M3UParserError: LocalizedError {
    case emptyPlaylist
    case noValidStreams
    case invalidURL(String)

    var errorDescription: String? {
        switch self {
        case .emptyPlaylist:
            return "Plik playlisty jest pusty."
        case .noValidStreams:
            return "Nie znaleziono żadnych strumieni w pliku .m3u8."
        case .invalidURL(let value):
            return "Nieprawidłowy adres URL: \(value)"
        }
    }
}

struct M3UParser {
    func parse(content: String, baseURL: URL? = nil) throws -> [StreamItem] {
        let lines = content
            .components(separatedBy: .newlines)
            .map { $0.trimmingCharacters(in: .whitespacesAndNewlines) }
            .filter { !$0.isEmpty }

        guard !lines.isEmpty else {
            throw M3UParserError.emptyPlaylist
        }

        var streams: [StreamItem] = []
        var pendingTitle: String?

        for line in lines {
            if line.hasPrefix("#") {
                if line.hasPrefix("#EXTINF:") {
                    pendingTitle = extractTitle(from: line)
                }
                continue
            }

            guard let url = resolveURL(from: line, baseURL: baseURL) else {
                throw M3UParserError.invalidURL(line)
            }

            let title = pendingTitle ?? defaultTitle(for: url, index: streams.count + 1)
            let isLive = isLiveStream(url: url, line: line)

            streams.append(StreamItem(title: title, url: url, isLive: isLive))
            pendingTitle = nil
        }

        guard !streams.isEmpty else {
            throw M3UParserError.noValidStreams
        }

        return streams
    }

    func parse(fileURL: URL) throws -> [StreamItem] {
        let content = try String(contentsOf: fileURL, encoding: .utf8)
        let baseURL = fileURL.deletingLastPathComponent()
        return try parse(content: content, baseURL: baseURL)
    }

    func parse(remoteURL: URL) async throws -> [StreamItem] {
        let (data, _) = try await URLSession.shared.data(from: remoteURL)
        guard let content = String(data: data, encoding: .utf8) else {
            throw M3UParserError.emptyPlaylist
        }

        if content.contains("#EXT-X-STREAM-INF") || content.contains("#EXT-X-TARGETDURATION") {
            return [StreamItem(title: remoteURL.lastPathComponent, url: remoteURL, isLive: true)]
        }

        return try parse(content: content, baseURL: remoteURL.deletingLastPathComponent())
    }

    private func extractTitle(from line: String) -> String {
        if let commaIndex = line.lastIndex(of: ",") {
            let title = String(line[line.index(after: commaIndex)...])
            return title.trimmingCharacters(in: .whitespacesAndNewlines)
        }
        return "Strumień"
    }

    private func resolveURL(from line: String, baseURL: URL?) -> URL? {
        if let absolute = URL(string: line), absolute.scheme != nil {
            return absolute
        }

        guard let baseURL else { return nil }
        return URL(string: line, relativeTo: baseURL)?.absoluteURL
    }

    private func defaultTitle(for url: URL, index: Int) -> String {
        let name = url.lastPathComponent
        if name.isEmpty || name == "/" {
            return "Strumień \(index)"
        }
        return name.replacingOccurrences(of: ".m3u8", with: "")
    }

    private func isLiveStream(url: URL, line: String) -> Bool {
        let lower = (url.absoluteString + line).lowercased()
        return lower.contains("live") || lower.hasSuffix(".m3u8")
    }
}
