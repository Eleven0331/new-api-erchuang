package model

import "github.com/QuantumNous/new-api/common"

type CustomerServiceMessage struct {
	Id        int    `json:"id"`
	UserId    int    `json:"user_id" gorm:"index;not null"`
	SenderId  int    `json:"sender_id" gorm:"index;not null"`
	Kind      string `json:"kind" gorm:"type:varchar(16);not null"`
	Content   string `json:"content" gorm:"type:text;not null"`
	CreatedAt int64  `json:"created_at" gorm:"autoCreateTime"`
}

type CustomerServiceMessageView struct {
	CustomerServiceMessage
	SenderName string `json:"sender_name"`
	IsStaff    bool   `json:"is_staff"`
}

func ListCustomerServiceMessages(userId int, isStaff bool) ([]CustomerServiceMessageView, error) {
	query := DB.Table("customer_service_messages AS message").
		Select("message.id, message.user_id, message.sender_id, message.kind, message.content, message.created_at, COALESCE(NULLIF(sender.display_name, ''), sender.username) AS sender_name, sender.role >= ? AS is_staff", common.RoleAdminUser).
		Joins("JOIN users AS sender ON sender.id = message.sender_id").
		Order("message.created_at ASC").
		Limit(200)
	if !isStaff {
		query = query.Where("message.user_id = ?", userId)
	}
	var messages []CustomerServiceMessageView
	return messages, query.Scan(&messages).Error
}
