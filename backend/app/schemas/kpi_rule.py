from pydantic import BaseModel, Field, model_validator
from typing import Optional


def _reject_bonus_and_penalty_together(bonus: Optional[int], penalty: Optional[int]) -> None:
    """Ступень KPI — либо поощрительная, либо штрафная.

    Решение принято явно (аудит M3): правило вида «выполнил план на 90% →
    одновременно +10% премии и −5% штрафа» не имеет делового смысла, это
    просто +5%, записанные запутанным способом. Раньше такое правило можно
    было создать, а расчёт зарплаты применял только бонус и молча
    игнорировал штраф — расхождение между тем, что настроено, и тем, что
    выплачено. Запрещаем на входе, а не «чиним» в расчёте.
    """
    if (bonus or 0) > 0 and (penalty or 0) > 0:
        raise ValueError(
            "Правило KPI задаёт либо бонус, либо штраф, но не оба сразу: "
            "оставьте одно из полей пустым или нулевым"
        )


class KpiRuleBase(BaseModel):
    min_percent: float = Field(..., ge=0.0, le=100.0, description="Минимальный процент выполнения KPI (0–100)")
    bonus: Optional[int] = Field(None, ge=0, description="Бонус в % от оклада")
    penalty: Optional[int] = Field(None, ge=0, description="Штраф в % от оклада")

    @model_validator(mode="after")
    def _check_bonus_xor_penalty(self):
        _reject_bonus_and_penalty_together(self.bonus, self.penalty)
        return self

class KpiRuleCreate(KpiRuleBase):
    pass

class KpiRuleOut(KpiRuleBase):
    id: int

    class Config:
        orm_mode = True

class KpiRuleUpdate(BaseModel):
    min_percent: Optional[float] = Field(None, ge=0.0, le=100.0)
    bonus: Optional[int] = Field(None, ge=0)
    penalty: Optional[int] = Field(None, ge=0)

    @model_validator(mode="after")
    def _check_bonus_xor_penalty(self):
        # Ловит только случай, когда оба поля пришли в одном запросе. Частичное
        # обновление (пришёл лишь bonus, а штраф уже лежит в базе) схема
        # проверить не может — это делает репозиторий на объединённых значениях.
        _reject_bonus_and_penalty_together(self.bonus, self.penalty)
        return self