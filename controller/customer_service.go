package controller

import (
	"errors"
	"strings"
	"unicode/utf8"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/constant"
	"github.com/QuantumNous/new-api/model"
	"github.com/gin-gonic/gin"
)

type customerServiceMessageRequest struct {
	Content string `json:"content"`
}

func customerServiceUser(c *gin.Context) (*model.User, bool, error) {
	userId := common.GetContextKeyInt(c, constant.ContextKeyUserId)
	if userId == 0 {
		return nil, false, errors.New("missing authenticated user")
	}
	user, err := model.GetUserById(userId, false)
	if err != nil {
		return nil, false, err
	}
	return user, user.Role >= common.RoleAdminUser, nil
}

func GetCustomerServiceMessages(c *gin.Context) {
	user, isStaff, err := customerServiceUser(c)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	messages, err := model.ListCustomerServiceMessages(user.Id, isStaff)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	common.ApiSuccess(c, gin.H{
		"messages":        messages,
		"is_staff":        isStaff,
		"current_user_id": user.Id,
	})
}

func CreateCustomerServiceMessage(c *gin.Context) {
	user, isStaff, err := customerServiceUser(c)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	var request customerServiceMessageRequest
	if err := common.DecodeJson(c.Request.Body, &request); err != nil {
		common.ApiError(c, err)
		return
	}
	content := strings.TrimSpace(request.Content)
	if content == "" || utf8.RuneCountInString(content) > 2000 {
		common.ApiErrorMsg(c, "message must be between 1 and 2000 characters")
		return
	}
	kind := "inquiry"
	if isStaff {
		kind = "reply"
	}
	message := model.CustomerServiceMessage{
		UserId:   user.Id,
		SenderId: user.Id,
		Kind:     kind,
		Content:  content,
	}
	if err := model.DB.Create(&message).Error; err != nil {
		common.ApiError(c, err)
		return
	}
	common.ApiSuccess(c, message)
}
