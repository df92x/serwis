import Foundation

struct StreamItem: Identifiable, Codable, Equatable, Hashable {
    let id: UUID
    var title: String
    var url: URL
    var isLive: Bool
    var addedAt: Date

    init(id: UUID = UUID(), title: String, url: URL, isLive: Bool = true, addedAt: Date = .now) {
        self.id = id
        self.title = title
        self.url = url
        self.isLive = isLive
        self.addedAt = addedAt
    }

    var displayURL: String {
        url.absoluteString
    }
}
